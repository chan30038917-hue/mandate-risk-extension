import { ethers } from 'ethers';

const PROTOCOL_READER = '0x2677738657F27e1A3591E00AD7E5a78807688C08';
const RPC_URL = 'https://rpc.monad.xyz';

const MARKET_MANAGERS = [
  '0xb3E9E0134354cc91b7FB9F9d6C3ab0dE7854BB49',
  '0xE1C24B2E93230FBe33d32Ba38ECA3218284143e2',
  '0x5EA0a1Cf3501C954b64902c5e92100b8A2CaB1Ac',
  '0xe5970cDB1916B2cCF6185C86C174EEE2d330D05B',
  '0xb00aFF53a4Df2b4E2f97a3d9ffaDb55564C8E42F',
  '0x05e70717fA8BD0F21a9F826d093d99f6Da4f1554',
  '0xa6A2A92F126b79Ee0804845ee6B52899b4491093',
  '0x01C4a0d396EFE982B1B103BE9910321d34e1aEA9',
  '0xBc4cd7bbd8d38027A88838B88BA04561FA778C35',
];

const PROTOCOL_READER_ABI = [
  'function liquidationValuesOf(address mm, address account, bool isAuction) external view returns (uint256 cSoft, uint256 cHard, uint256 debt, uint256 lFactor, bool errorHit)',
];

export interface CurvancePosition {
  marketManager: string;
  lFactor: number;
  debt: number;
  riesgo: 'SEGURO' | 'MEDIO' | 'CRITICO';
}

export async function getCurvanceHealth(walletAddress: string): Promise<CurvancePosition[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const reader = new ethers.Contract(PROTOCOL_READER, PROTOCOL_READER_ABI, provider);
  const positions: CurvancePosition[] = [];

  for (const marketManager of MARKET_MANAGERS) {
    try {
      const result = await reader.liquidationValuesOf(marketManager, walletAddress, false);
      const debt = result[2];
      const lFactor = result[3];

      if (debt > 0n) {
        const lFactorNum = parseFloat(ethers.formatUnits(lFactor, 18));

        let riesgo: 'SEGURO' | 'MEDIO' | 'CRITICO';
        if (lFactor === 0n) {
          riesgo = 'SEGURO';
        } else if (lFactorNum < 0.5) {
          riesgo = 'MEDIO';
        } else {
          riesgo = 'CRITICO';
        }

        positions.push({
          marketManager,
          lFactor: lFactorNum,
          debt: parseFloat(ethers.formatUnits(debt, 18)),
          riesgo,
        });
      }
    } catch (e) {
      continue;
    }
  }

  return positions;
}
