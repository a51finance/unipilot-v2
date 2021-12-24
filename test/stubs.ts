import { deployContract } from "ethereum-waffle";
import { Contract } from "ethers";
import { UniswapV3Deployer } from "./UniswapV3Deployer";
import WETH9Artifact from "uniswap-v3-deploy-plugin/src/util/WETH9.json";

export async function deployWETH9(deployer: any): Promise<Contract> {
  let weth9: Contract = await deployContract(deployer, WETH9Artifact, [], {
    gasPrice: 90000000000,
  });
  return weth9;
}
export async function deployUniswapContracts(
  deployer: any,
  WETH9: Contract,
): Promise<{ [name: string]: Contract }> {
  let uniswapV3 = UniswapV3Deployer.deploy(deployer, WETH9);
  return uniswapV3;
}
