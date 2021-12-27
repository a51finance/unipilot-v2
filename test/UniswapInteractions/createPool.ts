import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

export async function createPoolOnUniswap(
  deployer: SignerWithAddress,
  factory: Contract,
  token0: string,
  token1: string,
  fee: number,
  sqrtPrice: string,
): Promise<string> {
  let result = await factory.callStatic.createPool(token0, token1, fee);
  await factory.createPool(token0, token1, fee);
  let pool = await factory.getPool(token0, token1, fee);
  return pool;
}
