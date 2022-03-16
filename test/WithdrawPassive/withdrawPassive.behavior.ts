import { expect } from "chai";
import { Contract, constants, BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotPassiveVaultFixture,
} from "../utils/fixturesPassive";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UnipilotPassiveVault,
  UniswapV3Pool,
  NonfungiblePositionManager,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeWithdrawPassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniswapV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let vault: UnipilotPassiveVault;
  let DAI: Contract;
  let USDT: Contract;
  let pool: UniswapV3Pool;

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, other] = waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotPassiveVaultFixture>
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
    } = await loadFixture(unipilotPassiveVaultFixture));

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
        token0: USDT.address,
        token1: DAI.address,
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

  describe("#withdraw for passive pools", () => {
    beforeEach("Deposit in unipilot vault", async () => {
      await vault.deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );
    });

    it("withdraw", async () => {
      const reserves = await vault.callStatic.getPositionDetails();

      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userLpBalance = await vault.balanceOf(wallet.address);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      expect(userLpBalance).to.be.eq(0);
      expect(userUsdtBalance).to.be.eq(reserves[0]);
      expect(userDaiBalance).to.be.eq(reserves[1]);
    });

    it("withdraw with fees earned", async () => {
      await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
      await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

      const fees = await vault.callStatic.getPositionDetails();
      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      const details = await unipilotFactory.getUnipilotDetails();

      const amount0IndexFund = fees[2].div(details[3]);
      const amount1IndexFund = fees[3].div(details[3]);

      const total0 = fees[0].add(fees[2]);
      const total1 = fees[1].add(fees[3]);

      const indexFundAmount0 = fees[2].div(details[3]);
      const indexFundAmount1 = fees[3].div(details[3]);

      expect(userUsdtBalance).to.be.gte(total0.sub(indexFundAmount0));
      expect(userDaiBalance).to.be.gte(total1.sub(indexFundAmount1));
    });

    it("fees compounding on withdraw", async () => {
      await vault
        .connect(other)
        .deposit(
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      const user0LP = await vault.balanceOf(wallet.address);
      const user1LP = await vault.balanceOf(other.address);

      await generateFeeThroughSwap(swapRouter, other, USDT, DAI, "1000");
      await generateFeeThroughSwap(swapRouter, other, DAI, USDT, "1000");

      const reservesBefore = await vault.callStatic.getPositionDetails();
      const amount0ToCompound = reservesBefore[0].add(reservesBefore[2]).div(2);
      const amount1ToCompound = reservesBefore[1].add(reservesBefore[3]).div(2);

      const details = await unipilotFactory.getUnipilotDetails();
      const amount0IndexFund = reservesBefore[2].div(details[3]);
      const amount1IndexFund = reservesBefore[3].div(details[3]);

      await vault.connect(other).withdraw(user1LP, other.address, false);
      const reservesAfter = await vault.callStatic.getPositionDetails();

      expect(reservesAfter[0]).to.be.gt(
        amount0ToCompound.sub(amount0IndexFund).sub(parseUnits("0.25", "18")),
      );

      expect(reservesAfter[1]).to.be.gt(
        amount1ToCompound.sub(amount1IndexFund).sub(parseUnits("0.15", "18")),
      );

      const unusedAmount0 = await USDT.balanceOf(vault.address);

      await vault.withdraw(user0LP, wallet.address, false);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      expect(userUsdtBalance).to.be.eq(reservesAfter[0].add(unusedAmount0));
      expect(userDaiBalance).to.be.eq(reservesAfter[1]);
    });

    // it("should withdraw after pulling liquidity", async () => {
    //   await vault
    //     .connect(other)
    //     .deposit(
    //       parseUnits("1000", "18"),
    //       parseUnits("1000", "18"),
    //       other.address,
    //     );

    //   const user1LP = await vault.balanceOf(other.address);
    //   const user1DaiBalanceBefore = await DAI.balanceOf(other.address);
    //   const user1UsdtBalanceBefore = await USDT.balanceOf(other.address);

    //   await vault.pullLiquidity();

    //   const contractDaiBalance = await DAI.balanceOf(vault.address);
    //   const contractUsdtBalance = await USDT.balanceOf(vault.address);

    //   await vault.connect(other).withdraw(user1LP, other.address, false);

    //   const user1LpBalance = await vault.balanceOf(other.address);

    //   const user1DaiBalance = await DAI.balanceOf(other.address);
    //   const user1UsdtBalance = await USDT.balanceOf(other.address);

    //   expect(user1LpBalance).to.be.eq(0);
    //   expect(user1UsdtBalance.sub(user1UsdtBalanceBefore)).to.be.eq(
    //     contractUsdtBalance.div(2),
    //   );
    //   expect(user1DaiBalance.sub(user1DaiBalanceBefore)).to.be.eq(
    //     contractDaiBalance.div(2),
    //   );
    // });
  });
}
