import { Contract } from "ethers";
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
import hre from "hardhat";

import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";
import { expect } from "chai";
export async function shouldBehaveLikeRebalancePassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let pancakeV3Factory: Contract;
  let pancakeV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotPassiveVault;
  let PILOT: Contract;
  let ENS: Contract;
  let pacakePool: PancakeV3Pool;
  let token0Instance: Contract;
  let token1Instance: Contract;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("2", "18"),
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
      PILOT,
      ENS,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotPassiveVaultFixture));

    await pancakeV3Factory.enableFeeAmount(3000, 60);

    await pancakeV3Factory.createPool(PILOT.address, ENS.address, 3000);

    let pacakePoolAddress = await pancakeV3Factory.getPool(
      PILOT.address,
      ENS.address,
      3000,
    );

    pacakePool = (await ethers.getContractAt(
      "PancakeV3Pool",
      pacakePoolAddress,
    )) as PancakeV3Pool;

    await pacakePool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([pacakePoolAddress], [0], [100]);

    unipilotVault = await createVault(
      ENS.address,
      PILOT.address,
      3000,
      encodedPrice,
      "unipilot PILOT-ENS",
      "PILOT-ENS",
    );

    await ENS._mint(wallet.address, parseUnits("1000000", "18"));
    await PILOT._mint(wallet.address, parseUnits("1000000", "18"));

    await ENS._mint(alice.address, parseUnits("2000000", "18"));
    await PILOT._mint(alice.address, parseUnits("2000000", "18"));

    await ENS._mint(bob.address, parseUnits("100000000", "18"));
    await PILOT._mint(bob.address, parseUnits("100000000", "18"));

    await PILOT.approve(pancakeV3PositionManager.address, MaxUint256);
    await ENS.approve(pancakeV3PositionManager.address, MaxUint256);

    await PILOT.connect(alice).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );

    await ENS.connect(alice).approve(
      pancakeV3PositionManager.address,
      MaxUint256,
    );

    await ENS.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await PILOT.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await ENS.connect(wallet).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(wallet).approve(swapRouter.address, MaxUint256);

    await ENS.connect(bob).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(bob).approve(swapRouter.address, MaxUint256);

    const token0 =
      ENS.address.toLowerCase() < PILOT.address.toLowerCase()
        ? ENS.address.toLowerCase()
        : PILOT.address.toLowerCase();

    const token1 =
      ENS.address.toLowerCase() > PILOT.address.toLowerCase()
        ? ENS.address.toLowerCase()
        : PILOT.address.toLowerCase();

    token0Instance =
      ENS.address.toLowerCase() < PILOT.address.toLowerCase() ? ENS : PILOT;

    token1Instance =
      ENS.address.toLowerCase() > PILOT.address.toLowerCase() ? ENS : PILOT;

    await pancakeV3PositionManager.connect(alice).mint(
      {
        token0: token0,
        token1: token1,
        fee: 3000,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        amount0Desired: parseUnits("7000", "18"),
        amount1Desired: parseUnits("7000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        recipient: alice.address,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );
    await pacakePool.increaseObservationCardinalityNext("80");
  });

  it("Index fund account should recieve 10% of the pool fees earned.", async () => {
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
      2500,
      "5000",
    );

    await hre.network.provider.send("evm_increaseTime", [3600]);
    await hre.network.provider.send("evm_mine");

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    await unipilotVault.connect(wallet).readjustLiquidity(50);

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

    await generateFeeThroughSwap(
      swapRouter,
      bob,
      token0Instance,
      token1Instance,
      2500,
      "5000",
    );

    await hre.network.provider.send("evm_increaseTime", [3600]);
    await hre.network.provider.send("evm_mine");

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[2]).to.be.gt(parseUnits("0", "18"));

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
}
