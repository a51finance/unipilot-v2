import { expect } from "chai";
import { Contract, constants, BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotActiveVaultFixture,
} from "../utils/fixuresActive";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UnipilotActiveVault,
  UniswapV3Pool,
  NonfungiblePositionManager,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeWithdrawActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniswapV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let vault: UnipilotActiveVault;
  let pool: UniswapV3Pool;
  let AAVE: Contract;
  let USDC: Contract;
  let token0Instance: Contract;
  let token1Instance: Contract;

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, other] = waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotActiveVaultFixture>
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
      AAVE,
      USDC,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotActiveVaultFixture));

    await uniswapV3Factory.createPool(USDC.address, AAVE.address, 3000);

    let poolAddress = await uniswapV3Factory.getPool(
      AAVE.address,
      USDC.address,
      3000,
    );

    pool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await pool.initialize(encodePriceSqrt(1, 2));
    await uniStrategy.setBaseTicks([poolAddress], [100]);

    vault = await createVault(
      USDC.address,
      AAVE.address,
      3000,
      encodePriceSqrt(1, 2),
      "AAVE-USDC UniLP",
      "UniLP",
    );

    await USDC._mint(wallet.address, parseUnits("1000", "18"));
    await AAVE._mint(wallet.address, parseUnits("1000", "18"));

    await USDC._mint(other.address, parseUnits("400000000", "18"));
    await AAVE._mint(other.address, parseUnits("400000000", "18"));

    await USDC.approve(vault.address, constants.MaxUint256);
    await AAVE.approve(vault.address, constants.MaxUint256);

    await AAVE.connect(other).approve(vault.address, constants.MaxUint256);
    await AAVE.connect(other).approve(
      uniswapV3PositionManager.address,
      constants.MaxUint256,
    );
    await AAVE.connect(other).approve(swapRouter.address, constants.MaxUint256);

    await USDC.connect(other).approve(vault.address, constants.MaxUint256);
    await USDC.connect(other).approve(
      uniswapV3PositionManager.address,
      constants.MaxUint256,
    );
    await USDC.connect(other).approve(swapRouter.address, constants.MaxUint256);

    const token0 =
      USDC.address.toLowerCase() < AAVE.address.toLowerCase()
        ? USDC.address.toLowerCase()
        : AAVE.address.toLowerCase();

    const token1 =
      USDC.address.toLowerCase() > AAVE.address.toLowerCase()
        ? USDC.address.toLowerCase()
        : AAVE.address.toLowerCase();

    token0Instance =
      USDC.address.toLowerCase() < AAVE.address.toLowerCase() ? USDC : AAVE;

    token1Instance =
      USDC.address.toLowerCase() > AAVE.address.toLowerCase() ? USDC : AAVE;

    await uniswapV3PositionManager.connect(other).mint(
      {
        token0: token0,
        token1: token1,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: other.address,
        amount0Desired: parseUnits("100000", "18"),
        amount1Desired: parseUnits("100000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );
    await unipilotFactory.toggleWhitelistAccount(vault.address);
  });

  describe("#withdraw for active pools", () => {
    beforeEach("Add liquidity in vault and whiteliste vault", async () => {
      await vault.init();
      await vault.deposit(
        wallet.address,
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );
      await vault.readjustLiquidity();
    });

    it("withdraw", async () => {
      const reserves = await vault.callStatic.getPositionDetails();

      const unusedAmount0 = await token0Instance.balanceOf(vault.address);
      const unusedAmount1 = await token1Instance.balanceOf(vault.address);

      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userLpBalance = await vault.balanceOf(wallet.address);
      const userToken0Balance = await token0Instance.balanceOf(wallet.address);
      const userToken1Balance = await token1Instance.balanceOf(wallet.address);

      expect(userLpBalance).to.be.eq(0);
      expect(userToken0Balance).to.be.eq(reserves[0].add(unusedAmount0));
      expect(userToken1Balance).to.be.eq(reserves[1]);
    });

    it("emits an event", async () => {
      const liquidity = await vault.balanceOf(wallet.address);
      const reserves = await vault.callStatic.getPositionDetails();

      const unusedAmount0 = await token0Instance.balanceOf(vault.address);

      await expect(await vault.withdraw(liquidity, wallet.address, false))
        .to.emit(vault, "Withdraw")
        .withArgs(
          wallet.address,
          liquidity,
          reserves[0].add(unusedAmount0),
          reserves[1],
        );
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
      await generateFeeThroughSwap(
        swapRouter,
        other,
        token0Instance,
        token1Instance,
        "1000",
      );
      await generateFeeThroughSwap(
        swapRouter,
        other,
        token1Instance,
        token0Instance,
        "1000",
      );

      const fees = await vault.callStatic.getPositionDetails();
      const unusedAmount0 = await token0Instance.balanceOf(vault.address);

      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);

      const userToken0Balance = await token0Instance.balanceOf(wallet.address);
      const userToken1Balance = await token1Instance.balanceOf(wallet.address);

      const details = await unipilotFactory.getUnipilotDetails();

      const amount0IndexFund = fees[2].div(details[3]);
      const amount1IndexFund = fees[3].div(details[3]);

      const total0 = fees[0].add(fees[2]).add(unusedAmount0);
      const total1 = fees[1].add(fees[3]);

      expect(userToken0Balance).to.be.eq(total0.sub(amount0IndexFund));
      expect(userToken1Balance).to.be.eq(total1.sub(amount1IndexFund));
    });

    it("fees compounding on withdraw", async () => {
      await vault
        .connect(other)
        .deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      const user0LP = await vault.balanceOf(wallet.address);
      const user1LP = await vault.balanceOf(other.address);

      await generateFeeThroughSwap(
        swapRouter,
        other,
        token0Instance,
        token1Instance,
        "1000",
      );
      await generateFeeThroughSwap(
        swapRouter,
        other,
        token1Instance,
        token0Instance,
        "1000",
      );

      const reservesBefore = await vault.callStatic.getPositionDetails();

      const amount0ToCompound = reservesBefore[0].add(reservesBefore[2]).div(2);
      const amount1ToCompound = reservesBefore[1].add(reservesBefore[3]).div(2);

      const details = await unipilotFactory.getUnipilotDetails();

      const amount0IndexFund = reservesBefore[2].div(details[3]);
      const amount1IndexFund = reservesBefore[3].div(details[3]);

      await vault.connect(other).withdraw(user1LP, other.address, false);
      const reservesAfter = await vault.callStatic.getPositionDetails();

      expect(reservesAfter[0]).to.be.gte(
        amount0ToCompound.sub(amount0IndexFund),
      );
      expect(reservesAfter[1]).to.be.gte(
        amount1ToCompound.sub(amount1IndexFund),
      );

      const unusedAmount0 = await token0Instance.balanceOf(vault.address);

      await vault.withdraw(user0LP, wallet.address, false);

      const userToken0Balance = await token0Instance.balanceOf(wallet.address);
      const userToken1Balance = await token1Instance.balanceOf(wallet.address);

      expect(userToken0Balance).to.be.eq(reservesAfter[0].add(unusedAmount0));
      expect(userToken1Balance).to.be.eq(reservesAfter[1]);
    });

    it("receive correct amounts of liquidity for unclaimed pool fees", async () => {
      await generateFeeThroughSwap(
        swapRouter,
        other,
        token0Instance,
        token1Instance,
        "1000",
      );
      await generateFeeThroughSwap(
        swapRouter,
        other,
        token1Instance,
        token0Instance,
        "1000",
      );

      const { amount0, amount1 } = await vault
        .connect(other)
        .callStatic.deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      await vault
        .connect(other)
        .deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      const userToken0BalanceBfore = await token0Instance.balanceOf(
        other.address,
      );
      const userToken1BalanceBfore = await token1Instance.balanceOf(
        other.address,
      );

      const otherLP = await vault.balanceOf(other.address);

      await vault.connect(other).withdraw(otherLP, other.address, false);

      const userToken0BalanceAfter = await token0Instance.balanceOf(
        other.address,
      );
      const userToken1BalanceAfter = await token1Instance.balanceOf(
        other.address,
      );

      const t0 = userToken0BalanceAfter.sub(userToken0BalanceBfore);
      const t1 = userToken1BalanceAfter.sub(userToken1BalanceBfore);

      expect(t0).to.be.lte(amount0);
      expect(t1).to.be.lte(amount1);
    });

    it("after pulling liquidity should withdraw correctly", async () => {
      const deposit = await vault
        .connect(other)
        .callStatic.deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      await vault
        .connect(other)
        .deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      var user1LP = await vault.balanceOf(other.address);
      await vault.pullLiquidity(vault.address);

      const { amount0, amount1 } = await vault
        .connect(other)
        .callStatic.withdraw(user1LP, other.address, false);
      await vault.connect(other).withdraw(user1LP, other.address, false);
      user1LP = await vault.balanceOf(other.address);

      expect(user1LP).to.be.eq(0);
      expect(deposit[1]).to.be.eq(amount0.add(1));
      expect(deposit[2]).to.be.eq(amount1);
    });

    it("before pulling liquidity should withdraw correctly", async () => {
      await vault.pullLiquidity(vault.address);

      const deposit = await vault
        .connect(other)
        .callStatic.deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      await vault
        .connect(other)
        .deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      var user1LP = await vault.balanceOf(other.address);
      const { amount0, amount1 } = await vault
        .connect(other)
        .callStatic.withdraw(user1LP, other.address, false);
      await vault.connect(other).withdraw(user1LP, other.address, false);
      user1LP = await vault.balanceOf(other.address);

      expect(user1LP).to.be.eq(0);
      expect(deposit[1]).to.be.eq(amount0.add(1));
      expect(deposit[2]).to.be.eq(amount1);
    });

    it("after rerrange should withdraw correctly", async () => {
      await vault.pullLiquidity(vault.address);

      const unusedAmount0 = await token0Instance.balanceOf(vault.address);
      const unusedAmount1 = await token1Instance.balanceOf(vault.address);

      var reserves = await vault.callStatic.getPositionDetails();

      await vault
        .connect(other)
        .deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      await vault.rerange();

      await vault
        .connect(other)
        .deposit(
          other.address,
          parseUnits("1000", "18"),
          parseUnits("1000", "18"),
          other.address,
        );

      const unusedAmount0After = await token0Instance.balanceOf(vault.address);
      const unusedAmount1After = await token1Instance.balanceOf(vault.address);

      reserves = await vault.callStatic.getPositionDetails();
    });
  });
}
