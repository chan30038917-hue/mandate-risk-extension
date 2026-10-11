# Mandate Risk Monitor Extension

Extension de Chrome para monitorear el riesgo de liquidacion en Monad Mainnet.

## Que hace

- Interfaz visual para registrar wallets
- Muestra el health factor en tiempo real
- Etiquetas de riesgo: CRITICO, PRECAUCION, SEGURO
- Se conecta con la API del bot para compartir datos
- Sin custodia, sin permisos, solo lectura

## Instalacion

### Desde el codigo fuente

1. Clona el repositorio:
   git clone https://github.com/chan30038917-hue/mandate-risk-extension
   cd mandate-risk-extension

2. Instala las dependencias:
   pnpm install

3. Construye la extension:
   pnpm build

4. En Chrome:
   - Ve a chrome://extensions/
   - Activa "Modo de desarrollador"
   - Haz clic en "Cargar descomprimida"
   - Selecciona la carpeta .output/chrome-mv3/

## Uso

### 1. Obten tu Discord User ID

1. Abre Discord
2. Ve a Ajustes > Avanzado y activa "Modo desarrollador"
3. Cierra los ajustes
4. Haz clic derecho en tu nombre/perfil
5. Selecciona "Copiar ID"

### 2. Configura la extension

1. Haz clic en el icono de Mandate Risk Monitor en Chrome
2. Pega tu Discord User ID en el campo
3. Haz clic en "Guardar Discord ID"

### 3. Anade tus wallets

1. Pega una direccion de wallet (0x...)
2. Haz clic en "Añadir Wallet"
3. La wallet aparecera con su health factor y estado de riesgo

### 4. Recibe alertas

Cuando el health factor de una wallet baje de 1.5, recibiras un DM en Discord automaticamente.

## Estados de riesgo

| Health Factor | Etiqueta | Color |
|--------------|----------|-------|
| > 100 | SIN DEUDA | Verde |
| 1.5 - 100 | SEGURO | Verde |
| 1.1 - 1.5 | PRECAUCION | Amarillo |
| < 1.1 | CRITICO | Rojo |

## Red

- Red: Monad Mainnet
- Chain ID: 143
- RPC: https://rpc.monad.xyz

### Protocolos soportados

- Aave V3 Pool: 0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef
- Curvance ProtocolReader: 0x2677738657F27e1A3591E00AD7E5a78807688C08

## API

La extension se conecta a la API del bot:

Base URL: https://mandate-risk-bot-production.up.railway.app

### Endpoints usados

- POST /api/register - Registrar wallet
- GET /api/wallets/:discordId - Listar wallets
- GET /api/health-factor/:wallet - Obtener health factor

## Tecnologias

- WXT
- React
- TypeScript
- Chrome Manifest V3

## Licencia

MIT
