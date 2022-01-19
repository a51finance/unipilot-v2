import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployContract, Fixture } from "ethereum-waffle";
import { BigNumber, Contract, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import {
  NonfungiblePositionManager,
  UnipilotFactory,
  UnipilotVault,
} from "../../typechain";
import { UniswapV3Deployer } from "../UniswapV3Deployer";
import {
  deployStrategy,
  deployUnipilotRouter,
  deployUniswapContracts,
  deployWETH9,
} from "../stubs";
import hre from "hardhat";
import { deployPilot, deployToken } from "../TokenDeployer/TokenStubs";

const deployWeth9 = async (wallet: Wallet) => {
  let WETH9 = await deployWETH9(wallet);
  return WETH9;
};

const deployUniswap = async (wallet: Wallet) => {
  let WETH9 = await deployWeth9(wallet);
  let uniswapv3Contracts = await deployUniswapContracts(wallet, WETH9);
  console.log("uniswapv3COntracts factory", uniswapv3Contracts.factory.address);
  const nonFungible = await ethers.getContractFactory(
    "NonfungiblePositionManager",
  );
  const nonFungbileInstance = (await nonFungible.deploy(
    uniswapv3Contracts.factory.address,
    WETH9.address,
    uniswapv3Contracts.factory.address,
  )) as NonfungiblePositionManager;

  return {
    uniswapV3Factory: uniswapv3Contracts.factory,
    uniswapV3PositionManager: nonFungbileInstance,
    swapRouter: uniswapv3Contracts.router,
  };
};

interface UNISWAP_V3_FIXTURES {
  uniswapV3Factory: Contract;
  uniswapV3PositionManager: NonfungiblePositionManager;
  swapRouter: Contract;
}

interface TEST_ERC20 {
  PILOT: Contract;
  DAI: Contract;
  USDT: Contract;
}

interface STRATEGIES {
  uniStrategy: Contract;
}

interface UNIPILOT_FACTORY_FIXTURE {
  unipilotFactory: UnipilotFactory;
}

async function unipilotFactoryFixture(
  uniswapV3Factory: string,
  deployer: Wallet,
  uniStrategy: string,
): Promise<UNIPILOT_FACTORY_FIXTURE> {
  const unipilotFactoryDep = await ethers.getContractFactory("UnipilotFactory");
  let [wallet0, wallet1] = await hre.ethers.getSigners();

  const unipilotFactory = (await unipilotFactoryDep.deploy(
    uniswapV3Factory,
    deployer.address,
    uniStrategy,
    wallet1.address,
  )) as UnipilotFactory;
  return { unipilotFactory };
}

type FACTORIES = UNIPILOT_FACTORY_FIXTURE &
  UNISWAP_V3_FIXTURES &
  TEST_ERC20 &
  STRATEGIES;
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
    const [
      wallet,
      alice,
      bob,
      carol,
      other,
      user0,
      user1,
      user2,
      user3,
      user4,
    ] = waffle.provider.getWallets();
    const { uniswapV3Factory, uniswapV3PositionManager, swapRouter } =
      await deployUniswap(wallet);
    const uniStrategy = await deployStrategy(wallet);
    const router = await deployUnipilotRouter(wallet);
    const { unipilotFactory } = await unipilotFactoryFixture(
      uniswapV3Factory.address,
      wallet,
      uniStrategy.address,
    );

    const DAI = await deployToken(wallet, "Dai Stablecoin", "DAI", 18);
    const USDT = await deployToken(wallet, "Tether Stable", "USDT", 18);
    const PILOT = await deployPilot(wallet);
    const unipilotVaultDep = await ethers.getContractFactory("UnipilotVault");

    return {
      uniswapV3Factory,
      uniswapV3PositionManager,
      swapRouter,
      unipilotFactory,
      PILOT,
      DAI,
      USDT,
      uniStrategy,
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
        return unipilotVaultDep.attach(vaultAddress._vault) as UnipilotVault;
      },
    };
  };

export const getMinTick = (tickSpacing: number) =>
  Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
  Math.floor(887272 / tickSpacing) * tickSpacing;
