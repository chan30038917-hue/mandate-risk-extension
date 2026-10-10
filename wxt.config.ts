import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Mandate Risk Monitor',
    description: 'Monitorea el riesgo de liquidacion en Monad',
    version: '1.0.0',
    permissions: ['storage'],
    host_permissions: [
      'https://mandate-risk-bot.up.railway.app/*',
    ],
  },
});
