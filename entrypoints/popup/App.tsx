import { useState, useEffect } from 'react';
import './App.css';

const API_URL = "https://mandate-risk-bot-production.up.railway.app";

interface WalletData {
  address: string;
  healthFactor: number;
}

export default function App() {
  const [discordId, setDiscordId] = useState('');
  const [savedDiscordId, setSavedDiscordId] = useState('');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [newWallet, setNewWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['discordId'], (result) => {
      if (result.discordId && typeof result.discordId === 'string') {
        setDiscordId(result.discordId);
        setSavedDiscordId(result.discordId);
        fetchWallets(result.discordId);
      }
    });
  }, []);

  const fetchWallets = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/wallets/${id}`);
      const data = await res.json();
      const walletList = Array.isArray(data?.wallets) ? data.wallets : [];

      if (walletList.length === 0) {
        setWallets([]);
        return;
      }

      const walletData: WalletData[] = await Promise.all(
        walletList.map(async (w: any) => {
          const address = typeof w === 'string' ? w : w?.address || '';
          try {
            const hfRes = await fetch(`${API_URL}/api/health-factor/${address}`);
            const hfData = await hfRes.json();
            const hf = typeof hfData?.healthFactor === 'number' ? hfData.healthFactor : 999;
            return { address, healthFactor: hf };
          } catch {
            return { address, healthFactor: 999 };
          }
        })
      );
      setWallets(walletData);
    } catch (e) {
      console.error("Error fetching wallets:", e);
      setWallets([]);
    }
  };

  const handleSaveDiscord = () => {
    if (!discordId || discordId.length < 17) {
      setError('Discord ID invalido');
      return;
    }
    setSavedDiscordId(discordId);
    chrome.storage.local.set({ discordId });
    setError('');
    fetchWallets(discordId);
  };

  const handleAddWallet = async () => {
    if (!savedDiscordId) {
      setError('Primero guarda tu Discord ID');
      return;
    }
    if (!newWallet || !newWallet.startsWith('0x') || newWallet.length !== 42) {
      setError('Direccion invalida');
      return;
    }

    setLoading(true);
    try {
      await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: savedDiscordId, wallet: newWallet }),
      });
      setNewWallet('');
      await fetchWallets(savedDiscordId);
      setError('');
    } catch (e) {
      setError('Error conectando al servidor');
    }
    setLoading(false);
  };

  const handleRemoveWallet = async (address: string) => {
    if (!savedDiscordId) return;

    try {
      await fetch(`${API_URL}/api/wallets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: savedDiscordId, wallet: address }),
      });

      const updated = wallets.filter((w) => w.address !== address);
      setWallets(updated);
    } catch (e) {
      console.error('Error eliminando wallet:', e);
    }
  };

  const getRiskColor = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return '#888888';
    if (hf > 100) return '#22c55e';
    if (hf < 1.1) return '#ef4444';
    if (hf < 1.5) return '#f59e0b';
    return '#22c55e';
  };

  const getRiskLabel = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return 'SIN DATOS';
    if (hf > 100) return 'SIN DEUDA';
    if (hf < 1.1) return 'CRITICO';
    if (hf < 1.5) return 'PRECAUCION';
    return 'SEGURO';
  };

  const getRiskDescription = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return '—';
    if (hf > 100) return 'Sin posicion activa';
    if (hf < 1.1) return 'Liquidacion inminente';
    if (hf < 1.5) return 'Cerca de liquidacion';
    return 'Posicion saludable';
  };

  const formatHF = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return '—';
    if (hf > 100) return 'Sin deuda';
    return hf.toFixed(4);
  };

  const isCritical = (hf: number) => {
    return typeof hf === 'number' && !isNaN(hf) && hf < 1.1;
  };

  return (
    <div style={{
      width: '380px',
      minHeight: '500px',
      padding: '24px',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0a1a 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
      boxSizing: 'border-box',
      margin: 0,
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.3px' }}>
          Mandate Risk Monitor
        </div>
        <div style={{ fontSize: '10px', color: '#836EF9', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>
          Monad Mainnet
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Discord User ID
        </div>
        <input
          type="text"
          placeholder="123456789012345678"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#14121f',
            border: '1px solid rgba(131, 110, 249, 0.3)',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '12px',
            boxSizing: 'border-box',
            marginBottom: '10px',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSaveDiscord}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #836EF9 0%, #6b5ce0 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.3px',
          }}
        >
          Guardar Discord ID
        </button>
      </div>

      {Array.isArray(wallets) && wallets.map((w) => {
        const critical = isCritical(w.healthFactor);
        const riskColor = getRiskColor(w.healthFactor);

        return (
          <div
            key={w.address}
            className={critical ? 'critical-pulse' : ''}
            style={{
              background: `linear-gradient(135deg, ${riskColor}20 0%, ${riskColor}08 100%)`,
              border: `1.5px solid ${riskColor}`,
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '10px',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}>
              <span style={{
                fontSize: '12px',
                color: '#e5e5e5',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}>
                {w.address?.slice(0, 6) || '????'}...{w.address?.slice(-4) || '????'}
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: riskColor,
                  padding: '3px 8px',
                  border: `1.5px solid ${riskColor}`,
                  borderRadius: '5px',
                  background: `${riskColor}15`,
                }}>
                  {getRiskLabel(w.healthFactor)}
                </span>
                <button
                  onClick={() => handleRemoveWallet(w.address)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    fontSize: '20px',
                    lineHeight: '1',
                    cursor: 'pointer',
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}>
              <div>
                <div style={{
                  fontSize: '9px',
                  color: '#888',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                  fontWeight: 600,
                }}>
                  Health Factor
                </div>
                <div style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: riskColor,
                  fontFamily: 'monospace',
                  lineHeight: '1',
                }}>
                  {formatHF(w.healthFactor)}
                </div>
              </div>
              <div style={{
                fontSize: '10px',
                color: riskColor,
                fontWeight: 700,
                textAlign: 'right',
                maxWidth: '100px',
              }}>
                {getRiskDescription(w.healthFactor)}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: '16px' }}>
        <input
          type="text"
          placeholder="0x..."
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#14121f',
            border: '1px solid rgba(131, 110, 249, 0.3)',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '12px',
            boxSizing: 'border-box',
            marginBottom: '10px',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '11px',
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '10px',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}
        <button
          onClick={handleAddWallet}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#4a3f80' : 'linear-gradient(135deg, #836EF9 0%, #6b5ce0 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.3px',
          }}
        >
          {loading ? 'Registrando...' : 'Añadir Wallet'}
        </button>
      </div>
    </div>
  );
}
