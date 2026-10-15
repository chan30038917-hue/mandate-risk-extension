export default defineBackground(() => {
  // Actualizar el badge cada 5 minutos
  chrome.alarms.create('checkRisk', { periodInMinutes: 5 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'checkRisk') return;

    const result = await chrome.storage.local.get(['wallet', 'healthFactor']);
    if (!result.wallet) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const hf = result.healthFactor || 999;
    let color = '#22C55E'; // Verde
    let text = 'OK';

    if (hf < 1.1) {
      color = '#EF4444'; // Rojo
      text = '!!';
    } else if (hf < 1.5) {
      color = '#F59E0B'; // Amarillo
      text = '!';
    }

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  });
});

// ─── Dodo Payments: validación de licencia Pro ───

const PRODUCT_ID = 'pdt_0NpndMqzbLZS4SMoC433b';
const LICENSE_API = 'https://live.dodopayments.com/licenses/validate';

interface LicenseValidationResponse {
  valid: boolean;
  status?: string;
  expires_at?: string;
}

async function checkProAccess(licenseKey: string): Promise<boolean> {
  if (!licenseKey) return false;

  try {
    const response = await fetch(LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
      }),
    });

    if (!response.ok) return false;

    const data: LicenseValidationResponse = await response.json();
    return data.valid === true;
  } catch {
    // Si falla la red, permitir acceso temporal (grace period)
    return true;
  }
}

// Exponer la función para que el popup pueda usarla
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_PRO_ACCESS') {
    checkProAccess(message.licenseKey).then(sendResponse);
    return true; // mantener el canal abierto para respuesta asíncrona
  }
});
