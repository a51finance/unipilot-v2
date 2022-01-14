import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { createFixtureLoader, loadFixture } from "ethereum-waffle";
import { BigNumber, Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import {
  IUniswapV3Pool,
  UnipilotFactory,
  UnipilotVault,
} from "../../typechain";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";
import { shouleBehaveLikePilotFactory } from "../UnipilotFactoryFunctions/UnipilotFactory.behavior";
import { shouldBehaveLikeUnipilotRouterFunctions } from "../UnipilotRouterFunctions/unipilotRouterFunctions.behavior";
import {
  getMaxTick,
  getMinTick,
  unipilotVaultFixture,
} from "../utils/fixtures";
import { shouldBehaveLikeVaultFunctions } from "../VaultFunctions/VaultFunctions.behavior";
import { MaxUint256 } from "@ethersproject/constants";
import hre from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
export async function shouldBehaveLikeUnipilotFunctions(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  UnipilotRouter: Contract,
  WETH9: Contract,
  DAI: Contract,
  USDT: Contract,
  swapRouter: Contract,
): Promise<void> {
  // describe("Testing the UnipilotFactory !!", async () => {
  //   shouleBehaveLikePilotFactory(
  //     wallets,
  //     UnipilotFactory,
  //     uniswapV3Factory,
  //     USDT,
  //     DAI,
  //   );
  // });

  // describe("Testing the UnipilotRouter !!", async () => {
  //   shouldBehaveLikeUnipilotRouterFunctions(wallets, UnipilotRouter);
  // });
  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

  describe("Unipilot Vault Skeleton", async () => {
    let loadFixture: ReturnType<typeof createFixtureLoader>;
    let createVault: ThenArg<
      ReturnType<typeof unipilotVaultFixture>
    >["createVault"];
    let unipilotVault: UnipilotVault;
    let wallet: Wallet, other: Wallet;
    let unipilotFactory: UnipilotFactory;
    let uniswapV3Factory: Contract;
    let nftManager: Contract;
    let uniswapPool: Contract;
    let uniswapV3PositionManager: Contract;

    before("create fixture loader", async () => {
      [wallet, other] = await (ethers as any).getSigners();
      loadFixture = createFixtureLoader([wallet, other]);
      let [wallet0, wallet1] = await hre.ethers.getSigners();

      ({
        uniswapV3Factory,
        uniswapV3PositionManager,
        unipilotFactory,
        createVault,
      } = await loadFixture(unipilotVaultFixture));

      const encodedPrice = encodePriceSqrt(
        parseUnits("1", "18"),
        parseUnits("8", "18"),
      );
      unipilotVault = await createVault(
        USDT.address,
        DAI.address,
        3000,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );

      await unipilotFactory
        .connect(wallet0)
        .whitelistVaults([unipilotVault.address]);

      await USDT.connect(wallets[0]).approve(unipilotVault.address, MaxUint256);
      await DAI.connect(wallets[0]).approve(unipilotVault.address, MaxUint256);
      await USDT.connect(wallets[0]).approve(swapRouter.address, MaxUint256);
      await DAI.connect(wallets[0]).approve(swapRouter.address, MaxUint256);
      await DAI.approve(uniswapV3PositionManager.address, MaxUint256);
      await USDT.approve(uniswapV3PositionManager.address, MaxUint256);

      const poolAddress = await uniswapV3Factory.getPool(
        USDT.address,
        DAI.address,
        3000,
      );
      uniswapPool = (await ethers.getContractAt(
        "IUniswapV3Pool",
        poolAddress,
      )) as IUniswapV3Pool;

      console.log("pool unoswap", poolAddress);
      const a = await uniswapV3PositionManager
        .connect(wallet0)
        .callStatic.mint({
          token0: DAI.address,
          token1: USDT.address,
          tickLower: getMinTick(60),
          tickUpper: getMaxTick(60),
          fee: 3000,
          recipient: wallet0.address,
          amount0Desired: parseUnits("1000", "18"),
          amount1Desired: parseUnits("1000", "18"),
          amount0Min: 0,
          amount1Min: 0,
          deadline: 2000000000,
        });

      console.log("mint on uniswp", a);
      await uniswapV3PositionManager.connect(wallet0).mint({
        token0: DAI.address,
        token1: USDT.address,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet0.address,
        amount0Desired: parseUnits("1000", "18"),
        amount1Desired: parseUnits("1000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      });

      const uniswapLiq = await uniswapPool.liquidity();

      console.log("uniswap liq pool", uniswapLiq);
    });

    it("Vault functions to be executed", async () => {
      await shouldBehaveLikeVaultFunctions(
        wallets,
        unipilotVault,
        uniswapV3Factory,
        20,
        wallets[0].address,
        DAI,
        USDT,
        swapRouter,
        uniswapPool,
      );
    });

    // it("Router Function to be executed", async () => {
    //   await shouldBehaveLikeUnipilotRouterFunctions(
    //     wallets,
    //     unipilotFactory,
    //     unipilotVault,
    //     UnipilotRouter,
    //     DAI,
    //     USDT,
    //   );
    // });
  });
}
