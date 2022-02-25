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
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotPassiveVault,
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
  let daiUsdtVault: UnipilotPassiveVault;
  let shibPilotVault: UnipilotPassiveVault;
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
    ReturnType<typeof unipilotPassiveVaultFixture>
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
    } = await loadFixture(unipilotPassiveVaultFixture));

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
    await daiUsdtUniswapPool.increaseObservationCardinalityNext("80");
  });

  it("No tokens left unused", async () => {
    await daiUsdtVault
      .connect(wallet)
      .deposit(parseUnits("5000", "18"), parseUnits("5000", "18"));

    await generateFeeThroughSwap(swapRouter, bob, USDT, DAI, "2000");

    await hre.network.provider.send("evm_increaseTime", [3600]);
    await hre.network.provider.send("evm_mine");

    let positionDetails = await daiUsdtVault.callStatic.getPositionDetails();

    console.log("positionDetails", positionDetails);

    await daiUsdtVault.readjustLiquidity();
  });
}
