import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, Wallet, constants } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotVaultFixture,
} from "../utils/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { createFixtureLoader } from "ethereum-waffle";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import { UnipilotVault, UniswapV3Pool } from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";
import { userInfo } from "os";

export async function shouldBehaveLikeWithdraw(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
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

    await USDT.approve(vault.address, MaxUint256);
    await DAI.approve(vault.address, MaxUint256);
  });

  describe("#withdraw for active pools", () => {
    beforeEach("Add liquidity in vault and whiteliste vault", async () => {
      await unipilotFactory.whitelistVaults([vault.address]);
      await vault.init();
      await vault.deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));
    });

    it("withdraw", async () => {
      await vault.withdraw(parseUnits("1000", "18"), wallet.address);
      const userLpBalance = await vault.balanceOf(wallet.address);
      const userDaiBalance = await DAI.balanceOf(wallet.address);
      const userUsdtBalance = await USDT.balanceOf(wallet.address);

      expect(userLpBalance).to.be.equal(0);
      expect(userDaiBalance).to.be.gte(parseUnits("999", "18"));
      expect(userUsdtBalance).to.be.gte(parseUnits("999", "18"));
    });

    it("emits an event", async () => {
      const liquidity = await vault.balanceOf(wallet.address);
      const { amount0, amount1 } = await vault.callStatic.getPositionDetails();

      await expect(await vault.withdraw(liquidity, wallet.address))
        .to.emit(vault, "Withdraw")
        .withArgs(wallet.address, wallet.address, liquidity, amount0, amount1);
    });

    it("fails if liquidity is zero", async () => {
      await expect(vault.withdraw(0, wallet.address)).to.be.reverted;
    });

    it("fails if zero address", async () => {
      await expect(
        vault.withdraw(parseUnits("1000", "18"), constants.AddressZero),
      ).to.be.reverted;
    });

    it("fails if not owner", async () => {
      await expect(
        vault.connect(other).withdraw(parseUnits("1000", "18"), other.address),
      ).to.be.reverted;
    });

    it("fails if amount exceed user liquidity", async () => {
      await expect(vault.withdraw(parseUnits("1001", "18"), wallet.address)).to
        .be.reverted;
    });

    it("", async () => {});

    it("", async () => {});
  });
}
