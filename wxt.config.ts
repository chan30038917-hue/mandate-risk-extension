import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Mandate Risk Monitor',
    description: 'Monitorea el riesgo de liquidacion en Aave y Curvance en Monad',
    version: '1.0.0',
    permissions: ['storage', 'alarms'],
    host_permissions: [
      'https://rpc.monad.xyz/*',
    ],
  },
});
