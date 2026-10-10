import { useState, useEffect } from 'react';
import { getHealthFactor, getRiskLevel } from '../../src/utils/risk';
import './App.css';

interface WalletData {
  address: string;
  healthFactor: number;
  riskLevel: 'safe' | 'warning' | 'critical';
}

export default function App() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [newWallet, setNewWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar wallets guardadas al abrir
  useEffect(() => {
    chrome.storage.local.get(['wallets'], async (result) => {
      if (result.wallets && result.wallets.length > 0) {
        setWallets(result.wallets);
        // Actualizar los health factors al abrir
        await refreshAllWallets(result.wallets);
      }
    });
  }, []);

  const refreshAllWallets = async (walletList: WalletData[]) => {
    const updated = await Promise.all(
      walletList.map(async (w) => {
        const hf = await getHealthFactor(w.address);
        return { ...w, healthFactor: hf, riskLevel: getRiskLevel(hf) };
      })
    );
    setWallets(updated);
    chrome.storage.local.set({ wallets: updated });
  };

  const handleAddWallet = async () => {
    setError('');
    
    if (!newWallet || !newWallet.startsWith('0x') || newWallet.length !== 42) {
      setError('Direccion invalida. Debe empezar con 0x y tener 42 caracteres.');
      return;
    }

    if (wallets.some((w) => w.address.toLowerCase() === newWallet.toLowerCase())) {
      setError('Esta wallet ya esta en la lista.');
      return;
    }

    if (wallets.length >= 10) {
      setError('Maximo 10 wallets por extension.');
      return;
    }

    setLoading(true);
    const hf = await getHealthFactor(newWallet);
    const newData: WalletData = {
      address: newWallet,
      healthFactor: hf,
      riskLevel: getRiskLevel(hf),
    };

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
    if (level === 'critical') return '#EF4444';
    if (level === 'warning') return '#F59E0B';
    return '#22C55E';
  };

  const getRiskLabel = (level: string) => {
    if (level === 'critical') return 'CRITICO';
    if (level === 'warning') return 'PRECAUCION';
    return 'SEGURO';
  };

  // Actualizar badge con el peor caso
  useEffect(() => {
    if (wallets.length === 0) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const worst = wallets.reduce((prev, curr) => {
      if (curr.riskLevel === 'critical') return curr;
      if (prev.riskLevel === 'critical') return prev;
      if (curr.riskLevel === 'warning' && prev.riskLevel === 'safe') return curr;
      return prev;
    });

    let badgeText = 'OK';
    let badgeColor = '#22C55E';
    if (worst.riskLevel === 'critical') { badgeText = '!!'; badgeColor = '#EF4444'; }
    else if (worst.riskLevel === 'warning') { badgeText = '!'; badgeColor = '#F59E0B'; }

    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  }, [wallets]);

  return (
    <div className="app">
      <div className="header">
        <h1>Mandate Risk Monitor</h1>
        <span className="subtitle">Aave V3 · Monad Mainnet</span>
      </div>

      {/* Lista de wallets */}
      {wallets.length > 0 && (
        <div className="wallets-list">
          {wallets.map((w) => (
            <div key={w.address} className="wallet-card">
              <div className="wallet-header">
                <code className="address">
                  {w.address.slice(0, 6)}...{w.address.slice(-4)}
                </code>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveWallet(w.address)}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
              <div className="wallet-health">
                <span className="hf-value" style={{ color: getRiskColor(w.riskLevel) }}>
                  {w.healthFactor > 100 ? 'Sin deuda' : w.healthFactor.toFixed(4)}
                </span>
                <span className="hf-label" style={{ color: getRiskColor(w.riskLevel) }}>
                  {getRiskLabel(w.riskLevel)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para añadir wallet */}
      <div className="add-section">
        <input
          type="text"
          placeholder="0x..."
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
          className="input"
          disabled={loading}
        />
        {error && <div className="error">{error}</div>}
        <button onClick={handleAddWallet} disabled={loading} className="btn-primary">
          {loading ? 'Verificando...' : 'Añadir Wallet'}
        </button>
      </div>

      {wallets.length > 0 && (
        <button onClick={handleRefresh} disabled={loading} className="btn-secondary">
          {loading ? 'Actualizando...' : 'Actualizar Todo'}
        </button>
      )}

      <div className="footer">
        <a
          href="https://monadscan.com/address/0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef"
          target="_blank"
          rel="noreferrer"
        >
          Ver contrato en MonadScan
        </a>
      </div>
    </div>
  );
}
