import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

export async function createPoolOnAlgebra(
  deployer: SignerWithAddress,
  factory: Contract,
  token0: string,
  token1: string,
  sqrtPrice: string,
): Promise<string> {
  let result = await factory.callStatic.createPool(token0, token1);
  await factory.createPool(token0, token1);
  let pool = await factory.poolByPair(token0, token1);
  return pool;
}
