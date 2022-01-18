import { expect, use } from "chai";
import { Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";

import { solidity } from "ethereum-waffle";

import { waffle, ethers } from "hardhat";

import { parseUnits } from "@ethersproject/units";
import { getMaxTick, getMinTick, unipilotVaultFixture } from "./utils/fixtures";
import { encodePriceSqrt } from "./utils/encodePriceSqrt";
import { IUniswapV3Pool, NonfungiblePositionManager } from "../typechain";

use(solidity);

const createFixtureLoader = waffle.createFixtureLoader;

describe("Initializing the testing suite", async () => {
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: Contract;
  let WETH9: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDC: Contract;
  let USDT: Contract;
  let uniswapPool: Contract;
  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotVaultFixture>
  >["createVault"];

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
    console.log("Before callled -->");
  });

  beforeEach("setting up fixture contracts", async () => {
    console.log("BeforeEach callled -->");

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

    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );
    await uniswapV3Factory.createPool(DAI.address, USDT.address, 3000);

    poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    unipilotVault = await createVault(
      USDT.address,
      DAI.address,
      3000,
      encodedPrice,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    await unipilotFactory
      .connect(wallet)
      .whitelistVaults([unipilotVault.address]);

    await USDT._mint(wallet.address, parseUnits("2000000", "18"));
    await DAI._mint(wallet.address, parseUnits("2000000", "18"));

    await DAI.approve(uniswapV3PositionManager.address, MaxUint256);
    await USDT.approve(uniswapV3PositionManager.address, MaxUint256);

    await USDT.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(swapRouter.address, MaxUint256);

    const amounts = await uniswapV3PositionManager
      .connect(wallet)
      .callStatic.mint(
        {
          token0: USDT.address,
          token1: DAI.address,
          tickLower: getMinTick(60),
          tickUpper: getMaxTick(60),
          fee: 3000,
          recipient: wallet.address,
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

    console.log("amounts", amounts);
    await uniswapV3PositionManager.connect(wallet).mint(
      {
        token0: USDT.address,
        token1: DAI.address,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet.address,
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
  });

  it("checking name of vault LP Token", async () => {
    const vaultName = (await unipilotVault.name()).toString();
    expect(vaultName).to.be.equal("unipilot PILOT-USDT");
  });

  it("checking symbol of vault LP Token", async () => {
    const vaultSymbol = (await unipilotVault.symbol()).toString();
    expect(vaultSymbol).to.be.equal("PILOT-USDT");
  });

  it("checking total supply of vault LP Token", async () => {
    const totalSupply = (await unipilotVault.totalSupply()).toString();
    expect(totalSupply).to.be.equal("0");
  });

  it("should give user balance of dai and usdt before deposit", async () => {
    const daiBalance = await DAI.balanceOf(wallet.address);
    const usdtBalance = await USDT.balanceOf(wallet.address);
    expect(daiBalance).to.be.equal(parseUnits("2000000", "18"));
  });

  it("should successfully deposit liquidity", async () => {
    const usdtMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedUsdtOnUniswap = parseUnits("5000", "18").div(
      parseUnits("1", "18"),
    );

    const expectedUsdtBalanceBeforeDeposit =
      usdtMintedOnWallet0.sub(mintedUsdtOnUniswap);

    const usdtToBeDesposited = parseUnits("1000", "18").div(
      parseUnits("1", "18"),
    );
    const expectedUsdtBalanceAfterDeposit =
      expectedUsdtBalanceBeforeDeposit.sub(usdtToBeDesposited);

    console.log(
      "expectedUsdtBalanceAfterDeposit",
      expectedUsdtBalanceAfterDeposit,
    );

    const daiMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedDaiOnUniswap = parseUnits("5000", "18").div(
      parseUnits("8", "18"),
    );

    const expectedDaiBalanceBeforeDeposit =
      daiMintedOnWallet0.sub(mintedDaiOnUniswap); // 1995000

    const daiToBeDesposited = parseUnits("1000", "18").div(
      parseUnits("8", "18"),
    ); // 125

    const expectedDaiBalanceAfterDeposit =
      expectedDaiBalanceBeforeDeposit.sub(daiToBeDesposited); //1994875

    console.log(
      "expectedDaiBalanceAfterDeposit",
      expectedDaiBalanceAfterDeposit,
    );

    const resultDeposit = await unipilotVault
      .connect(wallet)
      .callStatic.deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

    console.log("resultDeposit", resultDeposit);

    expect(
      await unipilotVault
        .connect(wallet)
        .deposit(parseUnits("1000", "18"), parseUnits("1000", "18")),
    ).to.be.ok;

    const lpBalance = await unipilotVault.balanceOf(wallet.address);
    console.log("lpBalance", lpBalance);

    expect(lpBalance).to.be.equal(parseUnits("1000", "18"));

    const daiBalance = await DAI.balanceOf(wallet.address);
    const usdtBalance = await USDT.balanceOf(wallet.address);

    console.log("after first deposit balance", daiBalance, usdtBalance);
    expect(daiBalance).to.be.equal(expectedDaiBalanceAfterDeposit);
    expect(usdtBalance).to.be.equal(expectedUsdtBalanceAfterDeposit);
  });

  // describe("Running the pilot functions", async () => {
  //   it("Runs Unipilot Functions", async function () {
  //     let [wallet0, wallet1, wallet2, wallet3] = await hre.ethers.getSigners();
  //     let wallets: SignerWithAddress[] = [wallet0, wallet1, wallet2, wallet3];
  //     console.log("POSITION MANAGER", uniswapPositionManager.address);
  //     await shouldBehaveLikeUnipilotFunctions(wallets, WETH9, DAI, USDT);
  //   });
  // });
});
