export default defineBackground(() => {
  // ─── Registro del trial de 30 días ───
  chrome.runtime.onInstalled.addListener(async () => {
    const result = await chrome.storage.local.get('trialStartedAt');
    if (!result.trialStartedAt) {
      await chrome.storage.local.set({ trialStartedAt: Date.now() });
      console.log('Trial de 30 días iniciado');
    }
  });

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
    let color = '#22C55E';
    let text = 'OK';

    if (hf < 1.1) {
      color = '#EF4444';
      text = '!!';
    } else if (hf < 1.5) {
      color = '#F59E0B';
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

async function isTrialActive(): Promise<boolean> {
  const result = await chrome.storage.local.get('trialStartedAt');
  if (!result.trialStartedAt) return true;
  const daysPassed = (Date.now() - result.trialStartedAt) / (1000 * 60 * 60 * 24);
  return daysPassed < 30;
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
    return true;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_PRO_ACCESS') {
    checkProAccess(message.licenseKey).then(sendResponse);
    return true;
  }
  if (message.type === 'CHECK_TRIAL') {
    isTrialActive().then(sendResponse);
    return true;
  }
});
