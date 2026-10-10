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
