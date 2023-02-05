import { Fixture } from "ethereum-waffle";
import { BigNumber, Contract, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import {
  NonfungiblePositionManager,
  UnipilotActiveFactory,
  UnipilotActiveVault,
} from "../../typechain";
import {
  deployStrategy,
  deployAlegbraFinanceContracts,
  deployWETH9,
} from "../stubs";
import { deployToken } from "../TokenDeployer/TokenStubs";

const deployWeth9 = async (wallet: Wallet) => {
  let WETH9 = await deployWETH9(wallet);
  return WETH9;
};

const deployAlgebraFinance = async (wallet: Wallet, WETH9: Contract) => {
  let algebraContracts = await deployAlegbraFinanceContracts(wallet, WETH9);

  const nonFungible = await ethers.getContractFactory(
    "NonfungiblePositionManager",
  );
  const nonFungbileInstance = (await nonFungible.deploy(
    algebraContracts.factory.address,
    WETH9.address,
    algebraContracts.positionDescriptor.address,
    algebraContracts.pooldeployer.address,
  )) as NonfungiblePositionManager;
  const tx = await algebraContracts.pooldeployer.setFactory(
    algebraContracts.factory.address,
  );
  return {
    algebraFactory: algebraContracts.factory,
    algebraPositionManager: nonFungbileInstance,
    swapRouter: algebraContracts.router,
  };
};

interface ALGEBRA_FINANCE_FIXTURES {
  algebraFactory: Contract;
  algebraPositionManager: NonfungiblePositionManager;
  swapRouter: Contract;
}

interface TEST_ERC20 {
  DAI: Contract;
  USDT: Contract;
  UNI: Contract;
  SUSDC: Contract;
  USDC: Contract;
  AAVE: Contract;
}

interface STRATEGIES {
  uniStrategy: Contract;
}

interface UNIPILOT_FACTORY_FIXTURE {
  unipilotFactory: UnipilotActiveFactory;
}

async function unipilotFactoryFixture(
  algebraFactory: string,
  deployer: Wallet,
  indexFund: Wallet,
  uniStrategy: string,
  WETH9: Contract,
  indexFundPercentage: BigNumber,
): Promise<UNIPILOT_FACTORY_FIXTURE> {
  const unipilotFactoryDep = await ethers.getContractFactory(
    "UnipilotActiveFactory",
  );
  const unipilotFactory = (await unipilotFactoryDep.deploy(
    algebraFactory,
    deployer.address,
    uniStrategy,
    indexFund.address,
    WETH9.address,
    indexFundPercentage,
  )) as UnipilotActiveFactory;
  return { unipilotFactory };
}

type FACTORIES = UNIPILOT_FACTORY_FIXTURE &
  ALGEBRA_FINANCE_FIXTURES &
  TEST_ERC20 &
  STRATEGIES;
interface UNIPILOT_VAULT_FIXTURE extends FACTORIES {
  createVault(
    tokenA: string,
    tokenB: string,
    sqrtPrice: BigNumber,
    tokenName: string,
    tokenSymbol: string,
  ): Promise<UnipilotActiveVault>;
}

export const unipilotActiveVaultFixture: Fixture<UNIPILOT_VAULT_FIXTURE> =
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
    const { algebraFactory, algebraPositionManager, swapRouter } =
      await deployAlgebraFinance(wallet, WETH9);

    const uniStrategy = await deployStrategy(wallet);
    const indexFund = carol;
    const { unipilotFactory } = await unipilotFactoryFixture(
      algebraFactory.address,
      wallet,
      indexFund,
      uniStrategy.address,
      WETH9,
      BigNumber.from(10),
    );

    const DAI = await deployToken(wallet, "Dai Stablecoin", "DAI", 18);
    const USDT = await deployToken(wallet, "Tether Stable", "USDT", 18);
    const UNI = await deployToken(wallet, "Uniswap token", "UNI", 18);
    const SUSDC = await deployToken(wallet, "SUSDC token", "SUSDC", 18);
    const USDC = await deployToken(wallet, "USDC Token", "USDC", 18);
    const AAVE = await deployToken(wallet, "Aave token", "AAVE", 18);

    const unipilotVaultDep = await ethers.getContractFactory(
      "UnipilotActiveVault",
    );

    return {
      algebraFactory,
      algebraPositionManager,
      swapRouter,
      unipilotFactory,
      DAI,
      USDT,
      SUSDC,
      UNI,
      USDC,
      AAVE,
      uniStrategy,
      createVault: async (
        tokenA,
        tokenB,
        sqrtPrice,
        tokenName,
        tokenSymbol,
      ) => {
        const tx = await unipilotFactory.createVault(
          tokenA,
          tokenB,
          0,
          sqrtPrice,
          tokenName,
          tokenSymbol,
        );

        const vaultAddress = await unipilotFactory.vaults(tokenA, tokenB, 0);
        return unipilotVaultDep.attach(vaultAddress) as UnipilotActiveVault;
      },
    };
  };

export const getMinTick = (tickSpacing: number) =>
  Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
  Math.floor(887272 / tickSpacing) * tickSpacing;
