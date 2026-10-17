# Mandate Risk Monitor

Extensión de Chrome para monitorear el riesgo de liquidación en Aave V3 y Curvance en Monad Mainnet.

## 🌐 Sitio web oficial
**https://chan30038917-hue.github.io/mandate-risk-extension/**

## Qué hace
- Interfaz visual para registrar wallets
- Muestra el health factor en tiempo real
- Etiquetas de riesgo: CRÍTICO, PRECAUCIÓN, SEGURO
- Se conecta con la API del bot para compartir datos
- Sin custodia, sin permisos, solo lectura

## Precio
Pago de 5 USD. Incluye código de licencia que desbloquea la versión Pro por límite de 30 días.

## Políticas
- **Reembolso:** Aceptamos solicitudes dentro de los 7 días posteriores a la compra escribiendo a chan30038917@gmail.com.
- **Privacidad:** Solo recogemos Discord User ID, direcciones de wallet públicas y correo electrónico. No recogemos claves privadas ni datos financieros sensibles.

## Instalación (desde el código fuente)
1. Clona el repositorio: `git clone https://github.com/chan30038917-hue/mandate-risk-extension`
2. En Chrome: ve a `chrome://extensions/`, activa "Modo de desarrollador", haz clic en "Cargar descomprimida" y selecciona la carpeta `.output/chrome-mv3/`

## Uso
1. Obtén tu Discord User ID (Ajustes > Avanzado > Modo desarrollador, clic derecho en tu perfil > Copiar ID)
2. Pega tu Discord User ID en la extensión y guarda
3. Añade tus wallets (0x...)
4. Recibe alertas por DM cuando el health factor baje de 1.5

## Estados de riesgo
| Health Factor | Etiqueta | Color |
|---|---|---|
| > 100 | SIN DEUDA | Verde |
| 1.5 - 100 | SEGURO | Verde |
| 1.1 - 1.5 | PRECAUCIÓN | Amarillo |
| < 1.1 | CRÍTICO | Rojo |

## Protocolos soportados
- Pool Aave V3: `0x69xxx2fe0`
- Lector del Protocolo Curvance: `0x26xxx8C07`

## API
La extensión se conecta a la API del bot:
- URL base: https://mandate-risk-bot-production.up.railway.app
- `POST /api/register` - Registrar cartera
- `GET /api/wallets/:discordId` - Listar monederos
- `GET /api/health-factor/:wallet` - Obtener health factor

## Tecnologías
- WXT
- React
- TypeScript
- Chrome Manifest V3

## Licencia
MIT
