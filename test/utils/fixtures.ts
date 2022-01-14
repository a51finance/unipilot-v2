import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployContract, Fixture } from "ethereum-waffle";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { UnipilotFactory, UnipilotVault } from "../../typechain";
import { UniswapV3Deployer } from "../UniswapV3Deployer";
import {
  deployStrategy,
  deployUnipilotRouter,
  deployUniswapContracts,
  deployWETH9,
} from "../stubs";
import hre from "hardhat";

const deployWeth9 = async (wallet0: SignerWithAddress) => {
  let WETH9 = await deployWETH9(wallet0);
  return WETH9;
};

const deployUniswap = async (wallet0: SignerWithAddress) => {
  let WETH9 = await deployWeth9(wallet0);
  let uniswapv3Contracts = await deployUniswapContracts(wallet0, WETH9);
  console.log("uniswapv3COntracts factory", uniswapv3Contracts.factory.address);
  return {
    uniswapV3Factory: uniswapv3Contracts.factory,
    uniswapV3PositionManager: uniswapv3Contracts.positionManager,
  };
};

interface UNISWAP_V3_FIXTURES {
  uniswapV3Factory: Contract;
  uniswapV3PositionManager: Contract;
}
interface UNIPILOT_FACTORY_FIXTURE {
  unipilotFactory: UnipilotFactory;
}

async function unipilotFactoryFixture(
  uniswapV3Factory: string,
  deployer: SignerWithAddress,
  uniStrategy: string,
): Promise<UNIPILOT_FACTORY_FIXTURE> {
  const unipilotFactoryDep = await ethers.getContractFactory("UnipilotFactory");
  const unipilotFactory = (await unipilotFactoryDep.deploy(
    uniswapV3Factory,
    deployer.address,
    uniStrategy,
  )) as UnipilotFactory;
  return { unipilotFactory };
}

type FACTORIES = UNIPILOT_FACTORY_FIXTURE & UNISWAP_V3_FIXTURES;
interface UNIPILOT_VAULT_FIXTURE extends FACTORIES {
  createVault(
    tokenA: string,
    tokenB: string,
    fee: number,
    sqrtPrice: BigNumber,
    tokenName: string,
    tokenSymbol: string,
  ): Promise<UnipilotVault>;
}

export const unipilotVaultFixture: Fixture<UNIPILOT_VAULT_FIXTURE> =
  async function (): Promise<UNIPILOT_VAULT_FIXTURE> {
    let [wallet0, wallet1] = await hre.ethers.getSigners();
    const { uniswapV3Factory, uniswapV3PositionManager } = await deployUniswap(
      wallet0,
    );
    const uniStrategy = await deployStrategy(wallet0);
    const router = await deployUnipilotRouter(wallet0);
    console.log("UniStrategy address", uniStrategy.address);
    const { unipilotFactory } = await unipilotFactoryFixture(
      uniswapV3Factory.address,
      wallet0,
      uniStrategy.address,
    );

    console.log(
      "UnipilorFactory deployed inside fixture",
      unipilotFactory.address,
    );

    const unipilotVaultDep = await ethers.getContractFactory("UnipilotVault");

    return {
      uniswapV3Factory,
      uniswapV3PositionManager,
      unipilotFactory,
      createVault: async (
        tokenA,
        tokenB,
        fee,
        sqrtPrice,
        tokenName,
        tokenSymbol,
      ) => {
        const tx = await unipilotFactory.createVault(
          tokenA,
          tokenB,
          fee,
          sqrtPrice,
          tokenName,
          tokenSymbol,
        );

        const vaultAddress = await unipilotFactory.getVaults(
          tokenA,
          tokenB,
          fee,
        );

        console.log("Vault address inside fixture", vaultAddress);
        return unipilotVaultDep.attach(vaultAddress._vault) as UnipilotVault;
      },
    };
  };

export const getMinTick = (tickSpacing: number) =>
  Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
  Math.floor(887272 / tickSpacing) * tickSpacing;
