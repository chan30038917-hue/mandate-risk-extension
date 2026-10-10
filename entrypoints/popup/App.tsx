import { useState, useEffect } from 'react';
import { getHealthFactor, getRiskLevel } from '../../src/utils/risk';
import { getCurvanceHealth } from '../../src/utils/curvance';

interface WalletData {
  address: string;
  aaveHF: number;
  curvancePositions: { marketManager: string; lFactor: number; debt: number }[];
  riskLevel: 'safe' | 'warning' | 'critical';
}

export default function App() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [newWallet, setNewWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['wallets'], async (result) => {
      if (result.wallets && result.wallets.length > 0) {
        setWallets(result.wallets);
        await refreshAllWallets(result.wallets);
      }
    });
  }, []);

  const fetchWalletData = async (address: string): Promise<WalletData> => {
    const aaveHF = await getHealthFactor(address);
    const curvancePositions = await getCurvanceHealth(address);
    
    // Determine worst risk level
    const aaveLevel = getRiskLevel(aaveHF);
    let curvanceLevel: 'safe' | 'warning' | 'critical' = 'safe';
    for (const pos of curvancePositions) {
      if (pos.lFactor >= 0.8) curvanceLevel = 'critical';
      else if (pos.lFactor >= 0.5 && curvanceLevel !== 'critical') curvanceLevel = 'warning';
    }

    let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
    if (aaveLevel === 'critical' || curvanceLevel === 'critical') riskLevel = 'critical';
    else if (aaveLevel === 'warning' || curvanceLevel === 'warning') riskLevel = 'warning';

    return { address, aaveHF, curvancePositions, riskLevel };
  };

  const refreshAllWallets = async (walletList: WalletData[]) => {
    const updated = await Promise.all(
      walletList.map((w) => fetchWalletData(w.address))
    );
    setWallets(updated);
    chrome.storage.local.set({ wallets: updated });
  };

  const handleAddWallet = async () => {
    setError('');
    if (!newWallet || !newWallet.startsWith('0x') || newWallet.length !== 42) {
      setError('Direccion invalida');
      return;
    }
    if (wallets.some((w) => w.address.toLowerCase() === newWallet.toLowerCase())) {
      setError('Ya esta en la lista');
      return;
    }
    setLoading(true);
    const newData = await fetchWalletData(newWallet);
    const updated = [...wallets, newData];
    setWallets(updated);
    chrome.storage.local.set({ wallets: updated });
    setNewWallet('');
    setLoading(false);
  };

  const handleRemoveWallet = (address: string) => {
    const updated = wallets.filter((w) => w.address !== address);
    setWallets(updated);
    chrome.storage.local.set({ wallets: updated });
  };

  const handleRefresh = async () => {
    setLoading(true);
    await refreshAllWallets(wallets);
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    if (level === 'critical') return '#ef4444';
    if (level === 'warning') return '#f59e0b';
    return '#22c55e';
  };

  const getRiskLabel = (level: string) => {
    if (level === 'critical') return 'CRITICO';
    if (level === 'warning') return 'PRECAUCION';
    return 'SEGURO';
  };

  const getAaveLabel = (hf: number) => {
    if (hf > 100) return 'Sin deuda';
    return hf.toFixed(4);
  };

  return (
    <div style={{
      width: '380px',
      minHeight: '500px',
      padding: '24px',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0a1a 100%)',
      color: '#ffffff',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      boxSizing: 'border-box',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '19px', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.3px' }}>
          Mandate Risk Monitor
        </div>
        <div style={{ fontSize: '10px', color: '#836EF9', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 500 }}>
          Aave V3 · Curvance · Monad
        </div>
      </div>

      {wallets.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {wallets.map((w) => (
            <div key={w.address} style={{
              background: 'rgba(20, 18, 31, 0.8)',
              border: `1px solid ${getRiskColor(w.riskLevel)}40`,
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#a78bfa', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}>
                  {w.address.slice(0, 6)}...{w.address.slice(-4)}
                </span>
                <button
                  onClick={() => handleRemoveWallet(w.address)}
                  style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: 0, width: '20px', height: '20px', lineHeight: '1' }}
                >
                  ×
                </button>
              </div>

              {/* Aave */}
              <div style={{ marginBottom: w.curvancePositions.length > 0 ? '10px' : '0' }}>
                <div style={{ fontSize: '9px', color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 500 }}>
                  Aave V3
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: getRiskColor(getRiskLevel(w.aaveHF)) }}>
                    {getAaveLabel(w.aaveHF)}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: getRiskColor(getRiskLevel(w.aaveHF)) }}>
                    {w.aaveHF > 100 ? '—' : getRiskLabel(getRiskLevel(w.aaveHF))}
                  </span>
                </div>
              </div>

              {/* Curvance */}
              {w.curvancePositions.length > 0 && (
                <div>
                  <div style={{ fontSize: '9px', color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 500 }}>
                    Curvance
                  </div>
                  {w.curvancePositions.map((pos, idx) => {
                    const level = pos.lFactor >= 0.8 ? 'critical' : pos.lFactor >= 0.5 ? 'warning' : 'safe';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#a78bfa', fontFamily: '"JetBrains Mono", monospace' }}>
                          {pos.marketManager.slice(0, 6)}...
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: getRiskColor(level) }}>
                          {pos.lFactor.toFixed(4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="0x..."
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#14121f',
            border: '1px solid #836EF940',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '12px',
            fontFamily: '"JetBrains Mono", monospace',
            marginBottom: '12px',
            boxSizing: 'border-box',
            outline: 'none',
            fontWeight: 500,
          }}
        />
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '11px', padding: '10px', borderRadius: '8px', marginBottom: '12px', textAlign: 'center', fontWeight: 500 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleAddWallet}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #836EF9 0%, #6b5ce0 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          {loading ? 'Verificando...' : 'Añadir Wallet'}
        </button>
      </div>

      {wallets.length > 0 && (
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1px solid rgba(131, 110, 249, 0.3)',
            borderRadius: '10px',
            color: '#a78bfa',
            fontSize: '12px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            marginBottom: '16px',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          {loading ? 'Actualizando...' : 'Actualizar Todo'}
        </button>
      )}

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <a
          href="https://monadscan.com/address/0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '10px', color: '#555', textDecoration: 'none', fontWeight: 500 }}
        >
          Ver contrato en MonadScan
        </a>
      </div>
    </div>
  );
}
