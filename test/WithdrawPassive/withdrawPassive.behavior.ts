import { expect } from "chai";
import { Contract, constants, BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotPassiveVaultFixture,
} from "../utils/fixturesPassive";
import hre, { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UnipilotPassiveVault,
  PancakeV3Pool,
  NonfungiblePositionManager,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeWithdrawPassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let pancakeV3PositionManager: NonfungiblePositionManager;
  let pancakeV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let vault: UnipilotPassiveVault;
  let FEI: Contract;
  let SPELL: Contract;
  let pool: PancakeV3Pool;
  let token0Instance: Contract;
  let token1Instance: Contract;

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
      pancakeV3Factory,
      pancakeV3PositionManager,
      swapRouter,
      unipilotFactory,
      FEI,
      SPELL,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotPassiveVaultFixture));

    await pancakeV3Factory.createPool(FEI.address, SPELL.address, 2500, {
      gasLimit: 3e7,
    });

    let poolAddress = await pancakeV3Factory.getPool(
      FEI.address,
      SPELL.address,
      2500,
    );

    pool = (await ethers.getContractAt(
      "PancakeV3Pool",
      poolAddress,
    )) as PancakeV3Pool;

    await pool.initialize(encodePriceSqrt(1, 2));
    await uniStrategy.setBaseTicks([poolAddress], [0], [1800]);

    vault = await createVault(
      SPELL.address,
      FEI.address,
      2500,
      encodePriceSqrt(1, 2),
      "FEI-SPELL UniLP",
      "UniLP",
    );

    await SPELL._mint(wallet.address, parseUnits("1000", "18"));
    await FEI._mint(wallet.address, parseUnits("1000", "18"));

    await SPELL._mint(other.address, parseUnits("4000", "18"));
    await FEI._mint(other.address, parseUnits("4000", "18"));

    await SPELL.approve(vault.address, constants.MaxUint256);
    await FEI.approve(vault.address, constants.MaxUint256);

    await FEI.connect(other).approve(vault.address, constants.MaxUint256);
    await FEI.connect(other).approve(
      pancakeV3PositionManager.address,
      constants.MaxUint256,
    );
    await FEI.connect(other).approve(swapRouter.address, constants.MaxUint256);

    await SPELL.connect(other).approve(vault.address, constants.MaxUint256);
    await SPELL.connect(other).approve(
      pancakeV3PositionManager.address,
      constants.MaxUint256,
    );
    await SPELL.connect(other).approve(
      swapRouter.address,
      constants.MaxUint256,
    );

    const token0 =
      SPELL.address.toLowerCase() < FEI.address.toLowerCase()
        ? SPELL.address.toLowerCase()
        : FEI.address.toLowerCase();

    const token1 =
      SPELL.address.toLowerCase() > FEI.address.toLowerCase()
        ? SPELL.address.toLowerCase()
        : FEI.address.toLowerCase();

    token0Instance =
      SPELL.address.toLowerCase() < FEI.address.toLowerCase() ? SPELL : FEI;

    token1Instance =
      SPELL.address.toLowerCase() > FEI.address.toLowerCase() ? SPELL : FEI;

    await pancakeV3PositionManager.connect(other).mint(
      {
        token0: token0,
        token1: token1,
        fee: 2500,
        tickLower: getMinTick(50),
        tickUpper: getMaxTick(50),
        amount0Desired: parseUnits("1500", "18"),
        amount1Desired: parseUnits("1500", "18"),
        amount0Min: 0,
        amount1Min: 0,
        recipient: other.address.toLowerCase(),
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

      await hre.network.provider.send("evm_increaseTime", [3600]);
      await hre.network.provider.send("evm_mine");

      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);

      const userLpBalance = await vault.balanceOf(wallet.address);
      const userToken0Balance = await token0Instance.balanceOf(wallet.address);
      const userToken1Balance = await token1Instance.balanceOf(wallet.address);

      expect(userLpBalance).to.be.eq(0);
      expect(userToken0Balance).to.be.eq(reserves[0]);
      expect(userToken1Balance).to.be.eq(reserves[1]);
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

      await hre.network.provider.send("evm_increaseTime", [3600]);
      await hre.network.provider.send("evm_mine");

      const fees = await vault.callStatic.getPositionDetails();
      await vault.withdraw(parseUnits("1000", "18"), wallet.address, false);
      const userToken0Balance = await token0Instance.balanceOf(wallet.address);
      const userToken1Balance = await token1Instance.balanceOf(wallet.address);

      const details = await unipilotFactory.getUnipilotDetails();

      const amount0IndexFund = fees[2].div(details[3]);
      const amount1IndexFund = fees[3].div(details[3]);

      const total0 = fees[0].add(fees[2]);
      const total1 = fees[1].add(fees[3]);

      const indexFundAmount0 = fees[2].div(details[3]);
      const indexFundAmount1 = fees[3].div(details[3]);

      expect(userToken0Balance).to.be.gte(total0.sub(indexFundAmount0));
      expect(userToken1Balance).to.be.gte(total1.sub(indexFundAmount1));
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

      await hre.network.provider.send("evm_increaseTime", [3600]);
      await hre.network.provider.send("evm_mine");

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

      const unusedAmount0 = await token0Instance.balanceOf(vault.address);

      await vault.withdraw(user0LP, wallet.address, false);
      const userToken0Balance = await token0Instance.balanceOf(wallet.address);
      const userToken1Balance = await token1Instance.balanceOf(wallet.address);

      expect(userToken0Balance).to.be.eq(reservesAfter[0].add(unusedAmount0));
      expect(userToken1Balance).to.be.eq(reservesAfter[1]);
    });
  });
}
