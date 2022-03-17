import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
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
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotActiveVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeRebalanceActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotActiveVault;

  let SUSDC: Contract;
  let UNI: Contract;

  let uniswapPool: UniswapV3Pool;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("8", "18"),
  );

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
      uniswapV3Factory,
      uniswapV3PositionManager,
      swapRouter,
      unipilotFactory,
      SUSDC,
      UNI,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotActiveVaultFixture));

    await uniswapV3Factory.createPool(SUSDC.address, UNI.address, 3000);
    let uniswapPoolAddress = await uniswapV3Factory.getPool(
      SUSDC.address,
      UNI.address,
      3000,
    );

    uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      uniswapPoolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([uniswapPoolAddress], [1800]);

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

    await UNI._mint(bob.address, parseUnits("5000", "18"));
    await SUSDC._mint(bob.address, parseUnits("5000", "18"));

    await UNI._mint(alice.address, parseUnits("2000000", "18"));
    await SUSDC._mint(alice.address, parseUnits("2000000", "18"));

    await UNI.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await SUSDC.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await SUSDC.connect(wallet).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await UNI.connect(wallet).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await UNI.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );
    await SUSDC.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await UNI.connect(wallet).approve(swapRouter.address, MaxUint256);
    await SUSDC.connect(wallet).approve(swapRouter.address, MaxUint256);

    await UNI.connect(bob).approve(swapRouter.address, MaxUint256);
    await SUSDC.connect(bob).approve(swapRouter.address, MaxUint256);

    const token0 = UNI.address < SUSDC.address ? UNI.address : SUSDC.address;
    const token1 = UNI.address > SUSDC.address ? UNI.address : SUSDC.address;

    await uniswapV3PositionManager.connect(alice).mint(
      {
        token0: token0,
        token1: token1,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet.address,
        amount0Desired: parseUnits("7000", "18"),
        amount1Desired: parseUnits("7000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );
  });

  it("Only called by owner and whitelisted vaults are eligible for rebalance", async () => {
    await unipilotVault.init();
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );
    expect(await unipilotVault.readjustLiquidity()).to.be.ok;
  });

  it("Index fund account should recieve 10% of the pool fees earned.", async () => {
    await unipilotVault.init();

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );

    await generateFeeThroughSwap(swapRouter, bob, UNI, SUSDC, "5000");

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    console.log("positionDetails", positionDetails);

    await unipilotVault.readjustLiquidity();

    const fees0 = positionDetails[2];
    const fees1 = positionDetails[3];

    const percentageOfFees0Collected = fees0
      .mul(parseInt("10"))
      .div(parseInt("100"));

    const percentageOfFees1Collected = fees1
      .mul(parseInt("10"))
      .div(parseInt("100"));

    const indexFund = carol.address;

    const uniBalanceOfIndexFund = await UNI.balanceOf(indexFund);
    const susdcBalanceOfIndexFund = await SUSDC.balanceOf(indexFund);

    expect(percentageOfFees0Collected).to.be.equal(susdcBalanceOfIndexFund);
    expect(percentageOfFees1Collected).to.be.equal(uniBalanceOfIndexFund);
  });

  it("check fees compounding", async () => {
    await unipilotVault.init();

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("5000", "18"),
        parseUnits("5000", "18"),
        wallet.address,
      );

    const uniBalanceAfterDeposit = await UNI.balanceOf(wallet.address);
    const susdcBalanceAfterDeposit = await SUSDC.balanceOf(wallet.address);

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();
    await generateFeeThroughSwap(swapRouter, bob, UNI, SUSDC, "5000");

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[1]).to.be.gt(parseUnits("0", "18"));

    await unipilotVault.readjustLiquidity();

    let positionDetailsAferReadjust =
      await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetailsAferReadjust[2]).to.be.eq(parseUnits("0", "18"));

    let lpBalance = await unipilotVault.balanceOf(wallet.address);

    await unipilotVault.withdraw(lpBalance, wallet.address, false);

    lpBalance = await unipilotVault.balanceOf(wallet.address);

    expect(lpBalance).to.be.equal(parseUnits("0", "18"));

    const uniBalanceAfterWithdraw = await UNI.balanceOf(wallet.address);
    const susdcBalanceAfterWithdraw = await SUSDC.balanceOf(wallet.address);

    expect(uniBalanceAfterWithdraw).to.be.gt(uniBalanceAfterDeposit);
    expect(susdcBalanceAfterWithdraw).to.be.gt(susdcBalanceAfterDeposit);
  });
}
