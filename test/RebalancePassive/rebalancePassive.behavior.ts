import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotVaultFixture,
} from "../utils/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, network, waffle } from "hardhat";
import { createFixtureLoader } from "ethereum-waffle";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotVault,
} from "../../typechain";

import hre from "hardhat";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";
export async function shouldBehaveLikeRebalancePassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let daiUsdtVault: UnipilotVault;
  let shibPilotVault: UnipilotVault;
  let SHIB: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDT: Contract;
  let daiUsdtUniswapPool: UniswapV3Pool;
  let shibPilotUniswapPool: UniswapV3Pool;
  let token0: string;
  let token1: string;
  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("2", "18"),
  );

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotVaultFixture>
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
      DAI,
      USDT,
      PILOT,
      SHIB,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotVaultFixture));

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 3000);
    await uniswapV3Factory.createPool(SHIB.address, PILOT.address, 3000);

    let daiUsdtPoolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );

    let shibPilotPoolAddress = await uniswapV3Factory.getPool(
      SHIB.address,
      PILOT.address,
      3000,
    );

    daiUsdtUniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      daiUsdtPoolAddress,
    )) as UniswapV3Pool;

    shibPilotUniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      shibPilotPoolAddress,
    )) as UniswapV3Pool;

    await daiUsdtUniswapPool.initialize(encodedPrice);
    await shibPilotUniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks(
      [daiUsdtPoolAddress, shibPilotPoolAddress],
      [1800, 1800],
    );

    daiUsdtVault = await createVault(
      USDT.address,
      DAI.address,
      3000,
      encodedPrice,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    shibPilotVault = await createVault(
      SHIB.address,
      PILOT.address,
      3000,
      encodedPrice,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    await USDT._mint(wallet.address, parseUnits("1000000", "18"));
    await DAI._mint(wallet.address, parseUnits("1000000", "18"));

    await USDT._mint(alice.address, parseUnits("5000", "18"));
    await DAI._mint(alice.address, parseUnits("5000", "18"));

    await USDT._mint(bob.address, parseUnits("100000000", "18"));
    await DAI._mint(bob.address, parseUnits("100000000", "18"));

    await SHIB._mint(wallet.address, parseUnits("2000000", "18"));
    await PILOT._mint(wallet.address, parseUnits("2000000", "18"));

    await SHIB._mint(alice.address, parseUnits("2000000", "18"));
    await PILOT._mint(alice.address, parseUnits("2000000", "18"));

    await DAI.approve(uniswapV3PositionManager.address, MaxUint256);
    await USDT.approve(uniswapV3PositionManager.address, MaxUint256);

    await DAI.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await USDT.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await SHIB.approve(uniswapV3PositionManager.address, MaxUint256);
    await PILOT.approve(uniswapV3PositionManager.address, MaxUint256);

    await USDT.connect(wallet).approve(daiUsdtVault.address, MaxUint256);
    await DAI.connect(wallet).approve(daiUsdtVault.address, MaxUint256);

    await SHIB.connect(wallet).approve(shibPilotVault.address, MaxUint256);
    await PILOT.connect(wallet).approve(shibPilotVault.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(swapRouter.address, MaxUint256);

    await USDT.connect(bob).approve(swapRouter.address, MaxUint256);
    await DAI.connect(bob).approve(swapRouter.address, MaxUint256);

    await SHIB.connect(wallet).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(wallet).approve(swapRouter.address, MaxUint256);

    await SHIB.connect(alice).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(alice).approve(swapRouter.address, MaxUint256);

    await uniswapV3PositionManager.connect(alice).mint(
      {
        token0: USDT.address,
        token1: DAI.address,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: alice.address,
        amount0Desired: parseUnits("5000", "18"),
        amount1Desired: parseUnits("5000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );

    await daiUsdtUniswapPool.increaseObservationCardinalityNext("8");
    await shibPilotUniswapPool.increaseObservationCardinalityNext("8");
  });

  it("No tokens left unused", async () => {
    await daiUsdtVault.init();

    await daiUsdtVault
      .connect(wallet)
      .deposit(parseUnits("5000", "18"), parseUnits("5000", "18"));

    // let latestBlock = await hre.ethers.provider.getBlock("latest");

    // await network.provider.send("evm_increaseTime", [3600]);
    // await network.provider.send("evm_mine");

    // for (let i = 0; i < 10; i++) {
    //   await generateFeeThroughSwap(swapRouter, bob, USDT, DAI, "2000");
    //   await generateFeeThroughSwap(swapRouter, bob, DAI, USDT, "2000");
    // }

    // latestBlock = await hre.ethers.provider.getBlock("latest");
    // await network.provider.send("evm_increaseTime", [3600]);
    // await network.provider.send("evm_mine");

    await daiUsdtVault.readjustLiquidity();

    // await daiUsdtVault
    //   .connect(wallet)
    //   .deposit(parseUnits("5000", "18"), parseUnits("5000", "18"));

    for (let i = 0; i < 10; i++) {
      await generateFeeThroughSwap(swapRouter, bob, USDT, DAI, "4000");
      await generateFeeThroughSwap(swapRouter, bob, DAI, USDT, "2000");
    }
    await daiUsdtVault.readjustLiquidity();
  });
}
