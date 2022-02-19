import { deployContract } from "ethereum-waffle";
import { Contract } from "ethers";
import { UniswapV3Deployer } from "./UniswapV3Deployer";
import WETH9Artifact from "uniswap-v3-deploy-plugin/src/util/WETH9.json";
import UnipilotFactoryArtifact from "../artifacts/contracts/UnipilotPassiveFactory.sol/UnipilotPassiveFactory.json";
import UniStrategyArtifact from "../artifacts/contracts/UnipilotStrategy.sol/UnipilotStrategy.json";
import VaultArtifact from "../artifacts/contracts/UnipilotPassiveVault.sol/UnipilotPassiveVault.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

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
  let uniswapV3 = await UniswapV3Deployer.deploy(deployer, WETH9);
  return uniswapV3;
}

export async function deployUnipilotFactory(
  uniswapV3Factory: string,
  deployer: SignerWithAddress,
  uniStrategy: string,
  indexFund: string,
) {
  let unipilotFactory = await deployContract(
    deployer,
    UnipilotFactoryArtifact,
    [uniswapV3Factory, deployer.address, uniStrategy, indexFund],
    {
      gasPrice: 90000000000,
    },
  );
  return unipilotFactory;
}

export async function deployStrategy(deployer: any): Promise<Contract> {
  let uniStrategy: Contract = await deployContract(
    deployer,
    UniStrategyArtifact,
    [deployer.address],
  );
  return uniStrategy;
}
