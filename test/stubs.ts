import { deployContract } from "ethereum-waffle";
import { Contract } from "ethers";
import { UniswapV3Deployer } from "./UniswapV3Deployer";
import WETH9Artifact from "uniswap-v3-deploy-plugin/src/util/WETH9.json";
import UnipilotFactoryArtifact from "../artifacts/contracts/UnipilotFactory.sol/UnipilotFactory.json";
import UnipilotRouterArtifact from "../artifacts/contracts/UnipilotRouter.sol/UnipilotRouter.json";
import VaultArtifact from "../artifacts/contracts/UnipilotVault.sol/UnipilotVault.json";
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
  deployer: SignerWithAddress,
  uniswapV3Factory: string,
) {
  let unipilotFactory = await deployContract(
    deployer,
    UnipilotFactoryArtifact,
    [uniswapV3Factory, deployer.address],
    {
      gasPrice: 90000000000,
    },
  );
  return unipilotFactory;
}

export async function deployUnipilotRouter(deployer: any) {
  let unipilotRouter = await deployContract(
    deployer,
    UnipilotRouterArtifact,
    [deployer.address],
    {
      gasPrice: 90000000000,
    },
  );
  return unipilotRouter;
}

export async function deployUnipilotVault(
  deployer: SignerWithAddress,
  pool: string,
): Promise<Contract> {
  let vault: Contract = await deployContract(deployer, VaultArtifact, [
    deployer.address,
    pool,
    "Vault",
    "VAULT",
  ]);
  return vault;
}
