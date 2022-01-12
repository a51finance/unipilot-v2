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
  PILOT: Contract,
  USDT: Contract,
  positionManager: Contract,
  uniswapV3Factory: Contract,
): Promise<void> {
  describe("Testing the UnipilotFactory !!", async () => {
    shouleBehaveLikePilotFactory(
      wallets,
      UnipilotFactory,
      uniswapV3Factory,
      USDT,
      PILOT,
    );
  });

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
    let nftManager: Contract;
    let uniswapPool: Contract;

    before("create fixture loader", async () => {
      [wallet, other] = await (ethers as any).getSigners();
      loadFixture = createFixtureLoader([wallet, other]);
      let [wallet0, wallet1] = await hre.ethers.getSigners();

      ({ unipilotFactory, createVault } = await loadFixture(
        unipilotVaultFixture,
      ));

      const encodedPrice = encodePriceSqrt(
        parseUnits("1", "18"),
        parseUnits("1", "18"),
      );
      unipilotVault = await createVault(
        USDT.address,
        PILOT.address,
        3000,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );

      await USDT.connect(wallets[0]).approve(unipilotVault.address, MaxUint256);

      await PILOT.connect(wallets[0]).approve(
        unipilotVault.address,
        MaxUint256,
      );

      const allowanceUsdt = await USDT.allowance(
        wallets[0].address,
        unipilotVault.address,
      );

      const allowancePilot = await PILOT.allowance(
        wallets[0].address,
        unipilotVault.address,
      );

      const poolAddress = await uniswapV3Factory.getPool(
        USDT.address,
        PILOT.address,
        3000,
      );
      uniswapPool = (await ethers.getContractAt(
        "IUniswapV3Pool",
        poolAddress,
      )) as IUniswapV3Pool;

      nftManager = await positionManager.connect(wallet0).mint({
        token0: USDT.address,
        token1: PILOT.address,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet0.address,
        amount0Desired: parseUnits("100", "18"),
        amount1Desired: parseUnits("100", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      });
    });

    it("Vault functions to be executed", async () => {
      await shouldBehaveLikeVaultFunctions(
        wallets,
        unipilotVault,
        uniswapV3Factory,
        20,
        wallets[0].address,
        PILOT,
        USDT,
      );
    });

    it("Router Function to be executed", async () => {
      await shouldBehaveLikeUnipilotRouterFunctions(
        wallets,
        unipilotFactory,
        unipilotVault,
        UnipilotRouter,
        PILOT,
        USDT,
      );
    });
  });
}
