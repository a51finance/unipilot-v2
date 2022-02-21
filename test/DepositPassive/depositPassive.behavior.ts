import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotVaultFixture,
} from "../utils/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeDepositPassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotVault;
  let DAI: Contract;
  let USDT: Contract;
  let WETH9: Contract;
  let wethUsdtUniswapPool: UniswapV3Pool;
  const provider = waffle.provider;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("8", "18"),
  );

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let governance = wallet;

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
      WETH9,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotVaultFixture));

    await uniswapV3Factory.createPool(WETH9.address, USDT.address, 3000);

    let wethUsdtPoolAddress = await uniswapV3Factory.getPool(
      WETH9.address,
      USDT.address,
      3000,
    );

    wethUsdtUniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      wethUsdtPoolAddress,
    )) as UniswapV3Pool;

    await wethUsdtUniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([wethUsdtPoolAddress], [1800]);

    unipilotVault = await createVault(
      WETH9.address,
      USDT.address,
      3000,
      encodedPrice,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    await USDT._mint(wallet.address, parseUnits("10000", "18"));
    await USDT.connect(alice)._mint(alice.address, parseUnits("10000", "18"));

    await WETH9.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );
    await USDT.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await USDT.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await WETH9.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await WETH9.connect(wallet).approve(swapRouter.address, MaxUint256);

    await USDT.connect(wallet).approve(wethUsdtPoolAddress, MaxUint256);
    await WETH9.connect(wallet).approve(wethUsdtPoolAddress, MaxUint256);

    // await uniswapV3PositionManager.connect(alice).mint(
    //   {
    //     token0: WETH9.address,
    //     token1: USDT.address,
    //     tickLower: getMinTick(60),
    //     tickUpper: getMaxTick(60),
    //     fee: 3000,
    //     recipient: wallet.address,
    //     amount0Desired: parseUnits("1000", "18"),
    //     amount1Desired: parseUnits("1000", "18"),
    //     amount0Min: 0,
    //     amount1Min: 0,
    //     deadline: 2000000000,
    //   },
    //   {
    //     gasLimit: "3000000",
    //     value: parseUnits("1000", "18"),
    //   },
    // );
  });

  it("deposit suceed for eth", async () => {
    const ethBalanceBeforeDeposit = await wallet.getBalance();

    await unipilotVault
      .connect(wallet)
      .deposit(parseUnits("1000", "18"), parseUnits("10000", "18"), {
        value: parseUnits("1000", "18"),
      });

    await unipilotVault
      .connect(wallet)
      .deposit(parseUnits("1000", "18"), parseUnits("10000", "18"), {
        value: parseUnits("1000", "18"),
      });

    let positionDetails = await unipilotVault.callStatic.getPositionDetails(
      false,
    );
    console.log("potiondetails", positionDetails);

    const ethBalanceAfterDeposit = await wallet.getBalance();
    console.log(
      "ethBalanceAfterDeposit",
      ethBalanceAfterDeposit,
      ethBalanceBeforeDeposit,
    );

    const balance0ETH = await provider.getBalance(unipilotVault.address);
    console.log("balanceEth", balance0ETH);

    const ethDeposited = ethBalanceBeforeDeposit.sub(ethBalanceAfterDeposit);
    console.log("positionDetails", positionDetails[0], ethDeposited);
    expect(
      parseUnits("999", "18").lte(positionDetails[0]) &&
        positionDetails[0].lte(ethDeposited) &&
        ethDeposited.lt(parseUnits("1001", "18")),
    ).to.be.true;
  });

  it("deposit events emitted", async () => {
    await expect(
      await unipilotVault
        .connect(wallet)
        .deposit(parseUnits("1000", "18"), parseUnits("10000", "18"), {
          value: parseUnits("1000", "18"),
        }),
    ).to.emit(unipilotVault, "Deposit");
  });
}
