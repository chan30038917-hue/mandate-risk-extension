import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Mandate Risk Monitor',
    description: 'Monitorea el riesgo de liquidacion en Monad',
    version: '1.0.1',
    permissions: ['storage', 'alarms'],
    host_permissions: [
      'https://mandate-risk-bot-production.up.railway.app/*',
    ],
  },
});
