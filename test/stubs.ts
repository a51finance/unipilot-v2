import { deployContract } from "ethereum-waffle";
import { Contract } from "ethers";
import { AlgeraFinanceDeployer } from "./AlegbraFinanceDeployer";
import WETH9Artifact from "uniswap-v3-deploy-plugin/src/util/WETH9.json";
import UnipilotFactoryArtifact from "../artifacts/contracts/UnipilotPassiveFactory.sol/UnipilotPassiveFactory.json";
import UniStrategyArtifact from "../artifacts/contracts/UnipilotStrategy.sol/UnipilotStrategy.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function deployWETH9(deployer: any): Promise<Contract> {
  let weth9: Contract = await deployContract(deployer, WETH9Artifact, [], {
    gasPrice: 90000000000,
  });
  return weth9;
}
export async function deployAlegbraFinanceContracts(
  deployer: any,
  WETH9: Contract,
): Promise<{ [name: string]: Contract }> {
  let Algebra = await AlgeraFinanceDeployer.deploy(deployer, WETH9);
  return Algebra;
}

export async function deployUnipilotFactory(
  algebraFactory: string,
  deployer: SignerWithAddress,
  uniStrategy: string,
  indexFund: string,
) {
  let unipilotFactory = await deployContract(
    deployer,
    UnipilotFactoryArtifact,
    [algebraFactory, deployer.address, uniStrategy, indexFund],
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
