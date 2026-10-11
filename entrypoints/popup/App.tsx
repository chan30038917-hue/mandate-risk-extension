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

  const handleRemoveWallet = async (address: string) => {
    // Eliminar de la lista local
    const updated = wallets.filter((w) => w.address !== address);
    setWallets(updated);
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

  const isCritical = (hf: number) => {
    return typeof hf === 'number' && !isNaN(hf) && hf < 1.1;
  };

  return (
    <div className="app">
      <div className="header">
        <div className="title">Mandate Risk Monitor</div>
        <div className="subtitle">Monad Mainnet</div>
      </div>

      <div className="discord-section">
        <div className="label">Tu Discord User ID</div>
        <input
          type="text"
          placeholder="123456789012345678"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          className="input"
        />
        <button onClick={handleSaveDiscord} className="btn-primary">
          Guardar Discord ID
        </button>
      </div>

      {Array.isArray(wallets) && wallets.map((w) => {
        const critical = isCritical(w.healthFactor);
        const riskColor = getRiskColor(w.healthFactor);

        return (
          <div
            key={w.address}
            className={`wallet-card ${critical ? 'critical-pulse' : ''}`}
            style={{
              backgroundColor: `${riskColor}15`,
              borderColor: riskColor,
            }}
          >
            <div className="wallet-header">
              <span className="wallet-address">
                {w.address?.slice(0, 6) || '????'}...{w.address?.slice(-4) || '????'}
              </span>
              <div className="wallet-actions">
                <span
                  className="risk-label"
                  style={{
                    color: riskColor,
                    borderColor: riskColor,
                  }}
                >
                  {getRiskLabel(w.healthFactor)}
                </span>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveWallet(w.address)}
                  title="Eliminar wallet"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="wallet-body">
              <div>
                <div className="hf-label">Health Factor</div>
                <div className="hf-value" style={{ color: riskColor }}>
                  {formatHF(w.healthFactor)}
                </div>
              </div>
              <div className="hf-description" style={{ color: riskColor }}>
                {getRiskDescription(w.healthFactor)}
              </div>
            </div>
          </div>
        );
      })}

      <div className="add-section">
        <input
          type="text"
          placeholder="0x..."
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
          className="input"
        />
        {error && <div className="error">{error}</div>}
        <button onClick={handleAddWallet} disabled={loading} className="btn-primary">
          {loading ? 'Registrando...' : 'Añadir Wallet'}
        </button>
      </div>
    </div>
  );
}
