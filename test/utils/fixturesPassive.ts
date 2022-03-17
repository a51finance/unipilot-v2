import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployContract, Fixture } from "ethereum-waffle";
import { BigNumber, Contract, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import {
  NonfungiblePositionManager,
  UnipilotPassiveFactory,
  UnipilotPassiveVault,
} from "../../typechain";
import { deployStrategy, deployUniswapContracts, deployWETH9 } from "../stubs";
import { deployToken } from "../TokenDeployer/TokenStubs";

const deployWeth9 = async (wallet: Wallet) => {
  let WETH9 = await deployWETH9(wallet);
  return WETH9;
};

const deployUniswap = async (wallet: Wallet, WETH9: Contract) => {
  let uniswapv3Contracts = await deployUniswapContracts(wallet, WETH9);
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
  DAI: Contract;
  USDT: Contract;
  PILOT: Contract;
  SHIB: Contract;
  WETH9: Contract;
  ENS: Contract;
}

interface STRATEGIES {
  uniStrategy: Contract;
}

interface UNIPILOT_FACTORY_FIXTURE {
  unipilotFactory: UnipilotPassiveFactory;
}

async function unipilotFactoryFixture(
  uniswapV3Factory: string,
  deployer: Wallet,
  indexFund: Wallet,
  uniStrategy: string,
  WETH9: Contract,
  indexFundPercentage: BigNumber,
  swapPercentage: BigNumber,
): Promise<UNIPILOT_FACTORY_FIXTURE> {
  const unipilotFactoryDep = await ethers.getContractFactory(
    "UnipilotPassiveFactory",
  );
  const unipilotFactory = (await unipilotFactoryDep.deploy(
    uniswapV3Factory,
    deployer.address,
    uniStrategy,
    indexFund.address,
    WETH9.address,
    indexFundPercentage,
    swapPercentage,
  )) as UnipilotPassiveFactory;
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
  ): Promise<UnipilotPassiveVault>;
}

export const unipilotPassiveVaultFixture: Fixture<UNIPILOT_VAULT_FIXTURE> =
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
    const WETH9 = await deployWeth9(wallet);
    const { uniswapV3Factory, uniswapV3PositionManager, swapRouter } =
      await deployUniswap(wallet, WETH9);
    const uniStrategy = await deployStrategy(wallet);
    const indexFund = carol;
    const { unipilotFactory } = await unipilotFactoryFixture(
      uniswapV3Factory.address,
      wallet,
      indexFund,
      uniStrategy.address,
      WETH9,
      BigNumber.from(10),
      BigNumber.from(10),
    );

    const DAI = await deployToken(wallet, "Dai Stablecoin", "DAI", 18);
    const USDT = await deployToken(wallet, "Tether Stable", "USDT", 18);
    const PILOT = await deployToken(wallet, "Pilot", "PILOT", 18);
    const SHIB = await deployToken(wallet, "Shiba Inu", "SHIB", 18);
    const ENS = await deployToken(wallet, "Shiba Inu", "ENS", 18);

    const unipilotVaultDep = await ethers.getContractFactory(
      "UnipilotPassiveVault",
    );

    return {
      uniswapV3Factory,
      uniswapV3PositionManager,
      swapRouter,
      unipilotFactory,
      DAI,
      USDT,
      PILOT,
      SHIB,
      WETH9,
      ENS,
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

        const vaultAddress = await unipilotFactory.vaults(tokenA, tokenB, fee);
        return unipilotVaultDep.attach(vaultAddress) as UnipilotPassiveVault;
      },
    };
  };

export const getMinTick = (tickSpacing: number) =>
  Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
  Math.floor(887272 / tickSpacing) * tickSpacing;
