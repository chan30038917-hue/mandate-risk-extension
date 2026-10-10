import { ethers } from 'ethers';

const AAVE_POOL = '0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef';
const RPC_URL = 'https://rpc.monad.xyz';

const AAVE_POOL_ABI = [
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
];

export async function getHealthFactor(walletAddress: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const pool = new ethers.Contract(AAVE_POOL, AAVE_POOL_ABI, provider);

  try {
    const data = await pool.getUserAccountData(walletAddress);
    const healthFactor = data[5];

    if (healthFactor > ethers.parseUnits('100', 18)) {
      return 999;
    }

    return parseFloat(ethers.formatUnits(healthFactor, 18));
  } catch (error) {
    console.error('Error leyendo health factor:', error);
    return 999;
  }
}

export function getRiskLevel(healthFactor: number): 'safe' | 'warning' | 'critical' {
  if (healthFactor >= 1.5) return 'safe';
  if (healthFactor >= 1.1) return 'warning';
  return 'critical';
}
