import hre from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotActiveVaultFixture,
} from "../utils/fixuresActive";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  PancakeV3Pool,
  NonfungiblePositionManager,
  UnipilotActiveVault,
  UnipilotActiveFactory,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeRebalanceActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let pancakeV3Factory: Contract;
  let pancakeV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: UnipilotActiveFactory;
  let swapRouter: Contract;
  let unipilotVault: UnipilotActiveVault;

  let SUSDC: Contract;
  let UNI: Contract;

  let token0Instance: Contract;
  let token1Instance: Contract;

  let pancakePool: PancakeV3Pool;

  const encodedPrice = encodePriceSqrt(1, 2);

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotActiveVaultFixture>
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
      SUSDC,
      UNI,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotActiveVaultFixture));

    await pancakeV3Factory.enableFeeAmount(3000, 60);

    await pancakeV3Factory.createPool(SUSDC.address, UNI.address, 3000, {
      gasLimit: 3e7,
    });

    let pancakePoolAddress = await pancakeV3Factory.getPool(
      SUSDC.address,
      UNI.address,
      3000,
    );

    pancakePool = (await ethers.getContractAt(
      "PancakeV3Pool",
      pancakePoolAddress,
    )) as PancakeV3Pool;

    await pancakePool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([pancakePoolAddress], [0], [100]);

    unipilotVault = await createVault(
      UNI.address,
      SUSDC.address,
      3000,
      encodedPrice,
      "unipilot PILOT-UNI",
      "PILOT-UNI",
    );

    await UNI._mint(wallet.address, parseUnits("5000", "18"));
    await SUSDC._mint(wallet.address, parseUnits("5000", "18"));

    await UNI._mint(bob.address, parseUnits("20000000000", "18"));
    await SUSDC._mint(bob.address, parseUnits("20000000000", "18"));

    await UNI._mint(alice.address, parseUnits("20000000000", "18"));
    await SUSDC._mint(alice.address, parseUnits("20000000000", "18"));

    await UNI.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await SUSDC.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await SUSDC.connect(wallet).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );

    await UNI.connect(wallet).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );

    await UNI.connect(alice).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );
    await SUSDC.connect(alice).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );

    await UNI.connect(wallet).approve(swapRouter.address, MaxUint256);
    await SUSDC.connect(wallet).approve(swapRouter.address, MaxUint256);

    await UNI.connect(bob).approve(swapRouter.address, MaxUint256);
    await SUSDC.connect(bob).approve(swapRouter.address, MaxUint256);

    const token0 =
      UNI.address.toLowerCase() < SUSDC.address.toLowerCase()
        ? UNI.address.toLowerCase()
        : SUSDC.address.toLowerCase();

    const token1 =
      UNI.address.toLowerCase() > SUSDC.address.toLowerCase()
        ? UNI.address.toLowerCase()
        : SUSDC.address.toLowerCase();

    token0Instance =
      UNI.address.toLowerCase() < SUSDC.address.toLowerCase() ? UNI : SUSDC;

    token1Instance =
      UNI.address.toLowerCase() > SUSDC.address.toLowerCase() ? UNI : SUSDC;

    await pancakeV3PositionManager.connect(alice).mint(
      {
        token0: token0,
        token1: token1,
        fee: 3000,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        amount0Desired: parseUnits("20000000", "18"),
        amount1Desired: parseUnits("20000000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        recipient: wallet.address,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );

    unipilotVault.toggleOperator(wallet.address);
  });

  it("Only called by owner and whitelisted vaults are eligible for rebalance", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );
    expect(await unipilotVault.readjustLiquidity(50)).to.be.ok;
  });

  it("Index fund account should recieve 10% of the pool fees earned.", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );

    await generateFeeThroughSwap(
      swapRouter,
      bob,
      token0Instance,
      token1Instance,
      "5000",
    );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    await unipilotVault.readjustLiquidity(50);

    const fees0 = positionDetails[2];
    const fees1 = positionDetails[3];

    const percentageOfFees0Collected = fees0
      .mul(parseInt("10"))
      .div(parseInt("100"));

    const percentageOfFees1Collected = fees1
      .mul(parseInt("10"))
      .div(parseInt("100"));

    const indexFund = carol.address;

    const token0BalanceOfIndexFund = await token0Instance.balanceOf(indexFund);
    const token1BalanceOfIndexFund = await token1Instance.balanceOf(indexFund);

    expect(percentageOfFees0Collected).to.be.equal(token0BalanceOfIndexFund);
    expect(percentageOfFees1Collected).to.be.equal(token1BalanceOfIndexFund);
  });

  it("check fees compounding", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );

    const token0BalanceAfterDeposit = await token0Instance.balanceOf(
      wallet.address,
    );
    const token1BalanceAfterDeposit = await token1Instance.balanceOf(
      wallet.address,
    );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();
    await generateFeeThroughSwap(
      swapRouter,
      bob,
      token0Instance,
      token1Instance,
      "5000",
    );

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[1]).to.be.gt(0);

    await unipilotVault.readjustLiquidity(50);

    let positionDetailsAferReadjust =
      await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetailsAferReadjust[2]).to.be.eq(parseUnits("0", "18"));

    let lpBalance = await unipilotVault.balanceOf(wallet.address);

    await unipilotVault.withdraw(lpBalance, wallet.address, false);

    lpBalance = await unipilotVault.balanceOf(wallet.address);

    expect(lpBalance).to.be.equal(parseUnits("0", "18"));

    const token0BalanceAfterWithdraw = await token0Instance.balanceOf(
      wallet.address,
    );
    const token1BalanceAfterWithdraw = await token1Instance.balanceOf(
      wallet.address,
    );

    expect(token0BalanceAfterWithdraw).to.be.gt(token0BalanceAfterDeposit);
    expect(token1BalanceAfterWithdraw).to.be.gt(token1BalanceAfterDeposit);
  });

  it("readjust after pool out of range", async () => {
    await unipilotVault.rebalance(0, false, -6960, -6840); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(parseUnits("10", "18"), parseUnits("10", "18"), wallet.address);

    await generateFeeThroughSwap(
      swapRouter,
      bob,
      token0Instance,
      token1Instance,
      "30000",
    );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[1]).to.be.eq(0);

    await unipilotVault.readjustLiquidity(50);

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[0]).to.be.gt(0);
    expect(positionDetails[1]).to.be.gt(0);
  });

  it("only operator can readjust", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60));

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );

    await expect(unipilotVault.connect(alice).readjustLiquidity(50)).to.be
      .reverted;

    await unipilotVault.connect(wallet).toggleOperator(alice.address);

    expect(await unipilotVault.connect(alice).readjustLiquidity(50)).to.be.ok;

    await unipilotVault.connect(wallet).toggleOperator(alice.address);

    await expect(unipilotVault.connect(alice).readjustLiquidity(50)).to.be
      .reverted;
  });
}
