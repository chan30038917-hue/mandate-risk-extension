import { useState, useEffect } from 'react';
import './App.css';

const API_URL = "https://mandate-risk-bot-production.up.railway.app";

interface WalletData {
  address: string;
  aaveHealth: number;
  curvanceDebt: number;
  curvanceMarket: string;
  curvanceRisk: number;
  curvanceError: string | null;
}

export default function App() {
  const [discordId, setDiscordId] = useState('');
  const [savedDiscordId, setSavedDiscordId] = useState('');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [newWallet, setNewWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Estados para Pro ───
  const [licenseKey, setLicenseKey] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [proError, setProError] = useState('');
  const [proLoading, setProLoading] = useState(false);
  const [trialActive, setTrialActive] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState(30);
  const [licenseExpired, setLicenseExpired] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['discordId', 'licenseKey', 'trialStartedAt'], (result) => {
      if (result.discordId && typeof result.discordId === 'string') {
        setDiscordId(result.discordId);
        setSavedDiscordId(result.discordId);
        fetchWallets(result.discordId);
      }
      if (result.licenseKey && typeof result.licenseKey === 'string') {
        setLicenseKey(result.licenseKey);
        verifyLicense(result.licenseKey);
      }
      // Comprobar el trial
      chrome.runtime.sendMessage({ type: 'CHECK_TRIAL' }, (response) => {
        setTrialActive(response === true);
      });
      // Calcular días restantes
      if (result.trialStartedAt) {
        const daysPassed = (Date.now() - result.trialStartedAt) / (1000 * 60 * 60 * 24);
        setTrialDaysLeft(Math.max(0, Math.ceil(30 - daysPassed)));
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

          let aaveHealth = 999;
          let curvanceDebt = 0;
          let curvanceMarket = '';
          let curvanceRisk = 0;
          let curvanceError: string | null = null;

          try {
            const hfRes = await fetch(`${API_URL}/api/health-factor/${address}`);
            const hfData = await hfRes.json();
            aaveHealth = typeof hfData?.healthFactor === 'number' ? hfData.healthFactor : 999;
          } catch {
            aaveHealth = 999;
          }

          try {
            const curvRes = await fetch(`${API_URL}/api/curvance-health/${address}`);
            const curvData = await curvRes.json();
            curvanceDebt = typeof curvData?.debtUsd === 'number' ? curvData.debtUsd : 0;
            curvanceMarket = curvData?.marketName || '';
            curvanceRisk = typeof curvData?.riskLevel === 'number' ? curvData.riskLevel : 0;
            curvanceError = curvData?.error || null;
          } catch {
            curvanceError = 'Error consultando Curvance';
          }

          return { address, aaveHealth, curvanceDebt, curvanceMarket, curvanceRisk, curvanceError };
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
    if (!hasAccess) {
      setError('Tu licencia ha expirado. Renueva para seguir usando la extensión.');
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
    if (!hasAccess) {
      setError('Tu prueba de 30 días ha expirado. Actualiza a Pro para seguir usando la extensión.');
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

  const hasAccess = isPro || trialActive;

  // ─── Funciones Pro ───
  const verifyLicense = async (key: string) => {
    if (!key) return;
    setProLoading(true);
    setProError('');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_PRO_ACCESS',
        licenseKey: key,
      });
      if (response === true) {
        setIsPro(true);
        setLicenseExpired(false);
        await chrome.storage.local.set({ licenseKey: key });
      } else {
        setIsPro(false);
        setLicenseExpired(true);
        setProError('Licencia inválida o expirada. Renueva para seguir usando Pro.');
      }
    } catch {
      setProError('Error verificando licencia');
    }
    setProLoading(false);
  };

  const handleActivatePro = () => {
    if (!licenseKey || licenseKey.length < 10) {
      setProError('Introduce una licencia válida');
      return;
    }
    verifyLicense(licenseKey);
  };

  const handleBuyPro = async () => {
  try {
    const res = await fetch(`${API_URL}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });
    const data = await res.json();
    if (data.checkout_url) {
      chrome.tabs.create({ url: data.checkout_url });
    } else {
      console.error('No se recibió checkout_url del backend');
    }
  } catch (e) {
    console.error('Error llamando al backend:', e);
  }
};

  const handleJoinDiscord = () => {
    chrome.tabs.create({
      url: 'https://discord.gg/4ZB3AdMYk'
    });
  };

  const getAaveColor = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return '#888888';
    if (hf > 100) return '#22c55e';
    if (hf < 1.1) return '#ef4444';
    if (hf < 1.5) return '#f59e0b';
    return '#22c55e';
  };

  const getAaveLabel = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return 'SIN DATOS';
    if (hf > 100) return 'SIN DEUDA';
    if (hf < 1.1) return 'CRITICO';
    if (hf < 1.5) return 'PRECAUCION';
    return 'SEGURO';
  };

  const formatAaveHF = (hf: number) => {
    if (typeof hf !== 'number' || isNaN(hf)) return '—';
    if (hf > 100) return 'Sin deuda';
    return hf.toFixed(4);
  };

  const getCurvanceColor = (risk: number) => {
    if (risk === 0) return '#22c55e';
    if (risk < 0.75) return '#f59e0b';
    return '#ef4444';
  };

  const getCurvanceLabel = (risk: number) => {
    if (risk === 0) return 'SEGURO';
    if (risk < 0.75) return 'PRECAUCION';
    if (risk < 1) return 'CRITICO';
    return 'LIQUIDACION';
  };

  const isAaveCritical = (hf: number) => {
    return typeof hf === 'number' && !isNaN(hf) && hf < 1.1;
  };

  const isCurvanceCritical = (risk: number) => {
    return typeof risk === 'number' && risk >= 0.75;
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

      {/* ─── Sección Pro ─── */}
      <div style={{
        background: isPro ? 'rgba(34, 197, 94, 0.1)' : 'rgba(131, 110, 249, 0.1)',
        border: `1px solid ${isPro ? 'rgba(34, 197, 94, 0.4)' : 'rgba(131, 110, 249, 0.3)'}`,
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '10px', color: isPro ? '#22c55e' : (trialActive ? '#836EF9' : '#ef4444') }}>
          {isPro ? '✅ PRO ACTIVO' : (trialActive ? `⭐ PRUEBA GRATIS — ${trialDaysLeft} días restantes` : '🔒 PRUEBA EXPIRADA')}
        </div>

        {!isPro && (
          <>
            <input
              type="text"
              placeholder="Pega tu licencia de Lemon Squeezy"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#14121f',
                border: '1px solid rgba(131, 110, 249, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '11px',
                boxSizing: 'border-box',
                marginBottom: '8px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            {proError && (
              <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '8px' }}>
                {proError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleActivatePro}
                disabled={proLoading}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #836EF9 0%, #6b5ce0 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: proLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {proLoading ? '...' : 'Activar Pro'}
              </button>
              <button
                onClick={handleBuyPro}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(131, 110, 249, 0.2)',
                  border: '1px solid #836EF9',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Comprar $5/mes
              </button>
            </div>
          </>
        )}

        {licenseExpired && !isPro && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            padding: '10px',
            marginTop: '8px',
          }}>
            <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '8px', fontWeight: 600 }}>
              ⚠️ Tu licencia ha expirado
            </div>
            <button
              onClick={handleBuyPro}
              style={{
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, #836EF9 0%, #6b5ce0 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Renovar por $5/mes
            </button>
          </div>
        )}

        {isPro && (
          <button
            onClick={() => {
              setIsPro(false);
              setLicenseKey('');
              setLicenseExpired(false);
              chrome.storage.local.remove('licenseKey');
            }}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#888',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Cerrar sesión Pro
          </button>
        )}
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

        <button
          onClick={handleJoinDiscord}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(88, 101, 242, 0.2)',
            border: '1px solid #5865F2',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          Unirse al servidor de Discord
        </button>
      </div>

      {Array.isArray(wallets) && wallets.map((w) => {
        const aaveCritical = isAaveCritical(w.aaveHealth);
        const curvanceCritical = isCurvanceCritical(w.curvanceRisk);
        const aaveColor = getAaveColor(w.aaveHealth);
        const curvanceColor = getCurvanceColor(w.curvanceRisk);
        const hasCurvanceDebt = w.curvanceDebt > 0;

        return (
          <div
            key={w.address}
            className={aaveCritical || curvanceCritical ? 'critical-pulse' : ''}
            style={{
              background: 'linear-gradient(135deg, #14121f 0%, #0d0a1a 100%)',
              border: `1.5px solid ${aaveCritical || curvanceCritical ? '#ef4444' : (hasCurvanceDebt ? curvanceColor : aaveColor)}`,
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: '#e5e5e5', fontFamily: 'monospace', fontWeight: 600 }}>
                {w.address?.slice(0, 6) || '????'}...{w.address?.slice(-4) || '????'}
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
                }}
                title="Eliminar"
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                Aave V3
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: aaveColor, fontFamily: 'monospace' }}>
                  {formatAaveHF(w.aaveHealth)}
                </span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: aaveColor, padding: '2px 6px', border: `1px solid ${aaveColor}`, borderRadius: '4px' }}>
                  {getAaveLabel(w.aaveHealth)}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                Curvance
              </div>
              {w.curvanceError ? (
                <div style={{ fontSize: '10px', color: '#ef4444' }}>Error: {w.curvanceError}</div>
              ) : hasCurvanceDebt ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: curvanceColor, fontFamily: 'monospace' }}>
                      ${w.curvanceDebt.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: curvanceColor, padding: '2px 6px', border: `1px solid ${curvanceColor}`, borderRadius: '4px' }}>
                      {getCurvanceLabel(w.curvanceRisk)}
                    </span>
                  </div>
                  {w.curvanceMarket && (
                    <div style={{ fontSize: '9px', color: '#888' }}>Mercado: {w.curvanceMarket}</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>Sin posicion activa</div>
              )}
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
