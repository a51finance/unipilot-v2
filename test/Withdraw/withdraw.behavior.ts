import { expect } from "chai";
import { Contract, constants, BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotVaultFixture,
} from "../utils/fixtures";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UnipilotVault,
  UniswapV3Pool,
  NonfungiblePositionManager,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeWithdraw(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniswapV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let vault: UnipilotVault;
  let DAI: Contract;
  let USDT: Contract;
  let pool: UniswapV3Pool;

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, other] = waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotVaultFixture>
  >["createVault"];

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
  });

  beforeEach("basic setup", async () => {
    ({
      uniswapV3Factory,
      uniswapV3PositionManager,
      swapRouter,
      unipilotFactory,
      DAI,
      USDT,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotVaultFixture));

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 3000);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );

    pool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await pool.initialize(encodePriceSqrt(1, 2));
    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    vault = await createVault(
      USDT.address,
      DAI.address,
      3000,
      encodePriceSqrt(1, 2),
      "DAI-USDT UniLP",
      "UniLP",
    );

    await USDT._mint(wallet.address, parseUnits("1000", "18"));
    await DAI._mint(wallet.address, parseUnits("1000", "18"));

    await USDT._mint(other.address, parseUnits("4000", "18"));
    await DAI._mint(other.address, parseUnits("4000", "18"));

    await USDT.approve(vault.address, constants.MaxUint256);
    await DAI.approve(vault.address, constants.MaxUint256);

    await DAI.connect(other).approve(vault.address, constants.MaxUint256);
    await DAI.connect(other).approve(
      uniswapV3PositionManager.address,
      constants.MaxUint256,
    );
    await DAI.connect(other).approve(swapRouter.address, constants.MaxUint256);

    await USDT.connect(other).approve(vault.address, constants.MaxUint256);
    await USDT.connect(other).approve(
      uniswapV3PositionManager.address,
      constants.MaxUint256,
    );
    await USDT.connect(other).approve(swapRouter.address, constants.MaxUint256);

    await uniswapV3PositionManager.connect(other).mint(
      {
        token0: DAI.address,
        token1: USDT.address,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: other.address,
        amount0Desired: parseUnits("1500", "18"),
        amount1Desired: parseUnits("1500", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );
  });

  describe("#withdraw for active pools", () => {
    beforeEach("Add liquidity in vault and whiteliste vault", async () => {
      await unipilotFactory.whitelistVaults([vault.address]);
      await vault.init();
      await vault.deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));
    });

    it("withdraw", async () => {
      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userLpBalance = await vault.balanceOf(wallet.address);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      expect(userLpBalance).to.be.equal(0);
      expect(userDaiBalance).to.be.gte(parseUnits("999", "18"));
      expect(userUsdtBalance).to.be.gte(parseUnits("999", "18"));
    });

    it("emits an event", async () => {
      const liquidity = await vault.balanceOf(wallet.address);
      const reserves = await vault.callStatic.getPositionDetails(true);

      await expect(await vault.withdraw(liquidity, wallet.address, false))
        .to.emit(vault, "Withdraw")
        .withArgs(wallet.address, liquidity, reserves[0], reserves[1]);
    });

    it("fails if liquidity is zero", async () => {
      await expect(vault.withdraw(0, wallet.address, false)).to.be.reverted;
    });

    it("fails if zero address", async () => {
      await expect(
        vault.withdraw(parseUnits("1000", "18"), constants.AddressZero, false),
      ).to.be.reverted;
    });

    it("fails if not owner", async () => {
      await expect(
        vault
          .connect(other)
          .withdraw(parseUnits("1000", "18"), other.address, false),
      ).to.be.reverted;
    });

    it("fails if amount exceed user liquidity", async () => {
      await expect(
        vault.withdraw(parseUnits("1001", "18"), wallet.address, false),
      ).to.be.reverted;
    });

    it("withdraw with fees earned", async () => {
      await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
      await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

      const blnceBefore = await USDT.balanceOf(wallet.address);
      const fees = await vault.callStatic.getPositionDetails(true);
      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      const amount0IndexFund = fees[2].div(10);
      const amount1IndexFund = fees[3].div(10);

      const total0 = fees[0].add(fees[2]);
      const total1 = fees[1].add(fees[3]).add(blnceBefore);

      expect(userDaiBalance).to.be.equal(total0.sub(amount0IndexFund));
      expect(userUsdtBalance).to.be.equal(total1.sub(amount1IndexFund));
    });

    it("fees compounding on withdraw", async () => {
      await vault
        .connect(other)
        .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

      const user0LP = await vault.balanceOf(wallet.address);
      const user1LP = await vault.balanceOf(other.address);

      await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
      await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

      const blnceBefore = await USDT.balanceOf(wallet.address);

      const reservesBefore = await vault.callStatic.getPositionDetails(true);
      const amount0ToCompound = reservesBefore[0].add(reservesBefore[2]).div(2);
      const amount1ToCompound = reservesBefore[1].add(reservesBefore[3]).div(2);

      const amount0IndexFund = reservesBefore[2].div(10);
      const amount1IndexFund = reservesBefore[3].div(10);

      await vault.connect(other).withdraw(user1LP, other.address, false);
      const reservesAfter = await vault.callStatic.getPositionDetails(true);

      expect(reservesAfter[0]).to.be.gte(
        amount0ToCompound.sub(amount0IndexFund),
      );
      expect(reservesAfter[1]).to.be.lte(
        amount1ToCompound.sub(amount1IndexFund),
      );

      await vault.withdraw(user0LP, wallet.address, false);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      expect(userDaiBalance).to.be.eq(reservesAfter[0]);
      expect(userUsdtBalance).to.be.gte(reservesAfter[1].add(blnceBefore));
    });

    it("receive correct amounts of liquidity for unclaimed pool fees", async () => {
      await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
      await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

      const { amount0, amount1 } = await vault
        .connect(other)
        .callStatic.deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

      await vault
        .connect(other)
        .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

      const userDaiBalanceBfore = await DAI.balanceOf(other.address);
      const userUsdtBalanceBfore = await USDT.balanceOf(other.address);
      const otherLP = await vault.balanceOf(other.address);

      await vault.connect(other).withdraw(otherLP, other.address, false);

      const userDaiBalanceAfter = await DAI.balanceOf(other.address);
      const userUsdtBalanceAfter = await USDT.balanceOf(other.address);

      const t0 = userDaiBalanceAfter.sub(userDaiBalanceBfore);
      const t1 = userUsdtBalanceAfter
        .sub(userUsdtBalanceBfore)
        .sub(parseUnits("0.3", "18"));

      expect(t0).to.be.lte(amount0);
      expect(t1).to.be.lte(amount1);
    });
  });

  describe("#withdraw for passive pools", () => {
    beforeEach("Deposit in unipilot vault", async () => {
      await vault.deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));
    });

    it("withdraw", async () => {
      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userLpBalance = await vault.balanceOf(wallet.address);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      expect(userLpBalance).to.be.equal(0);
      expect(userDaiBalance).to.be.gte(parseUnits("999", "18"));
      expect(userUsdtBalance).to.be.gte(parseUnits("999", "18"));
    });

    // it("withdraw with fees earned", async () => {
    //   await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
    //   await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

    //   const blnceBefore = await USDT.balanceOf(wallet.address);
    //   const fees = await vault.callStatic.getPositionDetails(false);
    //   await vault.withdraw(parseUnits("1000", "18"), wallet.address);
    //   const userDaiBalance = await DAI.balanceOf(wallet.address);
    //   const userUsdtBalance = await USDT.balanceOf(wallet.address);

    //   const total0 = fees[0].add(fees[2]);
    //   const total1 = fees[1].add(fees[3]);

    //   expect(userDaiBalance).to.be.equal(total0);
    //   expect(userUsdtBalance).to.be.equal(total1);
    // });

    // it("fees compounding on withdraw", async () => {
    //   await vault
    //     .connect(other)
    //     .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

    //   const user0LP = await vault.balanceOf(wallet.address);
    //   const user1LP = await vault.balanceOf(other.address);

    //   await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
    //   await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

    //   const reservesBefore = await vault.callStatic.getPositionDetails(false);
    //   const amount0ToCompound = reservesBefore[0].add(reservesBefore[2]).div(2);
    //   const amount1ToCompound = reservesBefore[1].add(reservesBefore[3]).div(2);

    //   await vault.connect(other).withdraw(user1LP, other.address);
    //   const reservesAfter = await vault.callStatic.getPositionDetails(false);

    //   expect(amount0ToCompound).to.be.gte(reservesAfter[0]);
    //   expect(amount1ToCompound).to.be.eq(reservesAfter[1].sub(1));
    //   await vault.withdraw(user0LP, wallet.address);
    //   const userDaiBalance = await DAI.balanceOf(wallet.address);
    //   const userUsdtBalance = await USDT.balanceOf(wallet.address);

    //   expect(userDaiBalance).to.be.eq(amount0ToCompound);
    //   expect(userUsdtBalance).to.be.gte(amount1ToCompound);
    // });
  });
}
