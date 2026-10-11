import { useState, useEffect } from 'react';

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
    if (hf > 100) return 'Sin posicion';
    if (hf < 1.1) return 'Liquidacion inminente';
    if (hf < 1.5) return 'Cerca de liquidacion';
    return 'Posicion saludable';
  };

  const formatHF = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return '—';
    if (hf > 100) return 'Sin deuda';
    return hf.toFixed(4);
  };

  return (
    <div style={{ width: '380px', minHeight: '500px', padding: '24px', background: '#0a0a0f', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Mandate Risk Monitor</div>
        <div style={{ fontSize: '10px', color: '#836EF9', textTransform: 'uppercase' }}>Monad Mainnet</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Tu Discord User ID</div>
        <input
          type="text"
          placeholder="123456789012345678"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#14121f', border: '1px solid #836EF940', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
        />
        <button
          onClick={handleSaveDiscord}
          style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#836EF9', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
        >
          Guardar Discord ID
        </button>
      </div>

      {Array.isArray(wallets) && wallets.map((w) => (
        <div key={w.address} style={{
          background: `${getRiskColor(w.healthFactor)}15`,
          border: `1px solid ${getRiskColor(w.healthFactor)}`,
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#a78bfa', fontFamily: 'monospace' }}>
              {w.address?.slice(0, 6) || '????'}...{w.address?.slice(-4) || '????'}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: getRiskColor(w.healthFactor),
              padding: '2px 8px',
              border: `1px solid ${getRiskColor(w.healthFactor)}`,
              borderRadius: '4px',
            }}>
              {getRiskLabel(w.healthFactor)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                Health Factor
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: getRiskColor(w.healthFactor), fontFamily: 'monospace' }}>
                {formatHF(w.healthFactor)}
              </div>
            </div>
            <div style={{ fontSize: '9px', color: getRiskColor(w.healthFactor), fontWeight: 600, textAlign: 'right' }}>
              {getRiskDescription(w.healthFactor)}
            </div>
          </div>
        </div>
      ))}

      <input
        type="text"
        placeholder="0x..."
        value={newWallet}
        onChange={(e) => setNewWallet(e.target.value)}
        style={{ width: '100%', padding: '10px', background: '#14121f', border: '1px solid #836EF940', borderRadius: '8px', color: '#fff', fontSize: '12px', marginBottom: '8px', marginTop: '12px', boxSizing: 'border-box' }}
      />
      {error && <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '8px' }}>{error}</div>}
      <button
        onClick={handleAddWallet}
        disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#836EF9', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        {loading ? 'Registrando...' : 'Añadir Wallet'}
      </button>
    </div>
  );
}
