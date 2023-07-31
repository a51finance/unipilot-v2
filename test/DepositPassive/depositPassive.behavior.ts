import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotPassiveVaultFixture,
} from "../utils/fixturesPassive";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  PancakeV3Pool,
  NonfungiblePositionManager,
  UnipilotPassiveVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeDepositPassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let pancakeV3Factory: Contract;
  let pancakeV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotPassiveVault;
  let WETH9: Contract;
  let SHIB: Contract;
  let token0Instance: Contract;
  let token1Instance: Contract;

  let pancakePool: PancakeV3Pool;
  const provider = waffle.provider;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("8", "18"),
  );

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotPassiveVaultFixture>
  >["createVault"];

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
  });

  beforeEach("setting up fixture contracts", async () => {
    ({
      pancakeV3Factory,
      pancakeV3PositionManager,
      swapRouter,
      unipilotFactory,
      WETH9,
      SHIB,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotPassiveVaultFixture));

    await pancakeV3Factory.createPool(WETH9.address, SHIB.address, 3000);

    let pancakePoolAddress = await pancakeV3Factory.getPool(
      WETH9.address,
      SHIB.address,
      3000,
    );

    pancakePool = (await ethers.getContractAt(
      "PancakeV3Pool",
      pancakePoolAddress,
    )) as PancakeV3Pool;

    await pancakePool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([pancakePoolAddress], [0], [100]);

    unipilotVault = await createVault(
      SHIB.address,
      WETH9.address,
      3000,
      encodedPrice,
      "unipilot WETH-SHIB",
      "WETH-SHIB",
    );

    await SHIB.connect(wallet)._mint(user1.address, parseUnits("10000", "18"));
    await SHIB.connect(wallet)._mint(user2.address, parseUnits("10000", "18"));

    await SHIB.connect(wallet)._mint(wallet.address, parseUnits("10000", "18"));
    await SHIB.connect(alice)._mint(alice.address, parseUnits("10000", "18"));

    await SHIB.connect(alice).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );
    await WETH9.connect(alice).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );

    await SHIB.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await WETH9.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await SHIB.connect(user1).approve(unipilotVault.address, MaxUint256);
    await SHIB.connect(user2).approve(unipilotVault.address, MaxUint256);

    await SHIB.connect(wallet).approve(swapRouter.address, MaxUint256);
    await WETH9.connect(wallet).approve(swapRouter.address, MaxUint256);

    await SHIB.connect(wallet).approve(pancakePoolAddress, MaxUint256);
    await WETH9.connect(wallet).approve(pancakePoolAddress, MaxUint256);

    const token0 =
      SHIB.address.toLowerCase() < WETH9.address.toLowerCase()
        ? SHIB.address.toLowerCase()
        : WETH9.address.toLowerCase();

    const token1 =
      SHIB.address.toLowerCase() > WETH9.address.toLowerCase()
        ? SHIB.address.toLowerCase()
        : WETH9.address.toLowerCase();

    token0Instance =
      SHIB.address.toLowerCase() < WETH9.address.toLowerCase() ? SHIB : WETH9;

    token1Instance =
      SHIB.address.toLowerCase() > WETH9.address.toLowerCase() ? SHIB : WETH9;

    await pancakeV3PositionManager.connect(alice).mint(
      {
        token0: token0,
        token1: token1,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet.address,
        amount0Desired: parseUnits("1000", "18"),
        amount1Desired: parseUnits("1000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
        value: parseUnits("1000", "18"),
      },
    );
  });

  it("checking name of vault LP Token", async () => {
    const vaultName = (await unipilotVault.name()).toString();

    const tokenName =
      SHIB.address.toLowerCase() < WETH9.address.toLowerCase()
        ? "Unipilot SHIB/WETH Passive Vault"
        : "Unipilot WETH/SHIB Passive Vault";

    expect(vaultName).to.be.equal(tokenName);
  });

  it("checking symbol of vault LP Token", async () => {
    const vaultSymbol = await unipilotVault.symbol();
    const tokenSymbol =
      SHIB.address.toLowerCase() < WETH9.address.toLowerCase()
        ? "ULP-SHIB/WETH-PV"
        : "ULP-WETH/SHIB-PV";

    expect(vaultSymbol).to.be.equal(tokenSymbol);
  });

  it("deposit suceed for eth", async () => {
    const ethBalanceBeforeDeposit = await wallet.getBalance();

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
        {
          value: parseUnits("1000", "18"),
        },
      );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const ethBalanceAfterDeposit = await wallet.getBalance();

    const ethDeposited = ethBalanceBeforeDeposit.sub(ethBalanceAfterDeposit);

    expect(
      parseUnits("999", "18").lte(positionDetails[0]) &&
        positionDetails[0].lte(ethDeposited) &&
        ethDeposited.lt(parseUnits("1001", "18")),
    ).to.be.true;
  });

  it("should return extra eth during deposit", async () => {
    const user1InitialBalance = await user1.getBalance();
    const user2InitialBalance = await user2.getBalance();

    const amountOutMinimum = parseUnits("9999", "18");

    await unipilotVault
      .connect(user1)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        user1.address,
        {
          value: parseUnits("5000", "18"),
        },
      );

    await unipilotVault
      .connect(user2)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        user2.address,
        {
          value: parseUnits("7000", "18"),
        },
      );

    await unipilotVault
      .connect(user2)
      .withdraw(
        await unipilotVault.balanceOf(user2.address),
        user2.address,
        true,
      );

    await unipilotVault
      .connect(user1)
      .withdraw(
        await unipilotVault.balanceOf(user1.address),
        user1.address,
        true,
      );

    const user1FinalBalance = await user1.getBalance();
    const user2FinalBalance = await user2.getBalance();

    expect(user1FinalBalance).to.be.lte(user1InitialBalance);
    expect(user2FinalBalance).to.be.gte(amountOutMinimum);
  });
}
