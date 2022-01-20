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
import { ethers, waffle } from "hardhat";
import { createFixtureLoader } from "ethereum-waffle";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeDepositActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotVault;
  let shibPilotVault: UnipilotVault;
  let SHIB: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDT: Contract;
  let daiUsdtUniswapPool: UniswapV3Pool;
  let shibPilotUniswapPool: UniswapV3Pool;

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
    // console.log("Before callled -->");
  });

  beforeEach("setting up fixture contracts", async () => {
    // console.log("BeforeEach callled -->");

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

    unipilotVault = await createVault(
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

    await unipilotFactory
      .connect(wallet)
      .whitelistVaults([unipilotVault.address, shibPilotVault.address]);

    await USDT._mint(wallet.address, parseUnits("2000000", "18"));
    await DAI._mint(wallet.address, parseUnits("2000000", "18"));
    await SHIB._mint(wallet.address, parseUnits("2000000", "18"));
    await PILOT._mint(wallet.address, parseUnits("2000000", "18"));
    await SHIB._mint(alice.address, parseUnits("2000000", "18"));
    await PILOT._mint(alice.address, parseUnits("2000000", "18"));

    await DAI.approve(uniswapV3PositionManager.address, MaxUint256);
    await USDT.approve(uniswapV3PositionManager.address, MaxUint256);
    await SHIB.approve(uniswapV3PositionManager.address, MaxUint256);
    await PILOT.approve(uniswapV3PositionManager.address, MaxUint256);

    await USDT.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await SHIB.connect(wallet).approve(shibPilotVault.address, MaxUint256);
    await PILOT.connect(wallet).approve(shibPilotVault.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(swapRouter.address, MaxUint256);
    await SHIB.connect(wallet).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(wallet).approve(swapRouter.address, MaxUint256);

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

  it("should successfully deposit", async () => {
    const usdtMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedUsdtOnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedUsdtBalanceBeforeDeposit =
      usdtMintedOnWallet0.sub(mintedUsdtOnUniswap);

    const usdtToBeDesposited = parseUnits("1000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedUsdtBalanceAfterDeposit =
      expectedUsdtBalanceBeforeDeposit.sub(usdtToBeDesposited);

    console.log(
      "expectedUsdtBalanceAfterDeposit",
      expectedUsdtBalanceAfterDeposit,
    );

    const daiMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedDaiOnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18"));

    console.log("mintedDaiOnUniswap", mintedDaiOnUniswap);
    const expectedDaiBalanceBeforeDeposit =
      daiMintedOnWallet0.sub(mintedDaiOnUniswap); // 1995000

    const daiToBeDesposited = parseUnits("1000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18")); // 125

    const expectedDaiBalanceAfterDeposit =
      expectedDaiBalanceBeforeDeposit.sub(daiToBeDesposited); //1994875

    console.log(
      "expectedDaiBalanceAfterDeposit",
      expectedDaiBalanceAfterDeposit,
    );

    await unipilotVault.init();
    await unipilotVault
      .connect(wallet)
      .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

    const daiBalance: BigNumber = await DAI.balanceOf(wallet.address);
    const usdtBalance: BigNumber = await USDT.balanceOf(wallet.address);

    // console.log(
    //   "after first deposit balance",
    //   daiBalance,
    //   expectedDaiBalanceAfterDeposit,
    //   usdtBalance,
    //   expectedUsdtBalanceAfterDeposit,
    // );

    // expect(daiBalance).to.be.equal(expectedDaiBalanceAfterDeposit);
    // expect(usdtBalance).to.be.equal(expectedUsdtBalanceAfterDeposit);
  });

  it("should successfully predict amounts after deposit", async () => {
    await unipilotVault.init();
    await unipilotVault
      .connect(wallet)
      .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

    await unipilotVault.readjustLiquidity();

    await unipilotVault
      .connect(wallet)
      .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

    const usdtMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedUsdtOnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedUsdtBalanceBeforeDeposit =
      usdtMintedOnWallet0.sub(mintedUsdtOnUniswap);

    const usdtToBeDesposited = parseUnits("2000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedUsdtBalanceAfterDeposit =
      expectedUsdtBalanceBeforeDeposit.sub(usdtToBeDesposited);

    const daiMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedDaiOnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18"));

    const expectedDaiBalanceBeforeDeposit =
      daiMintedOnWallet0.sub(mintedDaiOnUniswap); // 1995000

    const daiToBeDesposited = parseUnits("2000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18")); // 125

    const expectedDaiBalanceAfterDeposit =
      expectedDaiBalanceBeforeDeposit.sub(daiToBeDesposited); //1994875

    const daiBalance: BigNumber = await DAI.balanceOf(wallet.address);
    const usdtBalance: BigNumber = await USDT.balanceOf(wallet.address);

    console.log(
      "after second deposit balance",
      daiBalance,
      expectedDaiBalanceAfterDeposit,
      usdtBalance,
      expectedUsdtBalanceAfterDeposit,
    );

    expect(daiBalance).to.be.equal(expectedDaiBalanceAfterDeposit);
    expect(usdtBalance).to.be.equal(expectedUsdtBalanceAfterDeposit);
  });

  // it("passive whitelist readjust", async () => {
  //   await unipilotFactory
  //     .connect(wallet)
  //     .whitelistVaults([unipilotVault.address]);

  //   await unipilotVault.init();
  //   await unipilotVault
  //     .connect(wallet)
  //     .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));

  //   // await unipilotVault.connect(wallet).readjustLiquidity();
  // });

  it("fees calculation", async () => {
    const pilotBalanceBeforeDeposit: BigNumber = await PILOT.balanceOf(
      wallet.address,
    );

    const shibBalanceBeforeDeposit: BigNumber = await SHIB.balanceOf(
      wallet.address,
    );

    const shibMintedOnWallet = parseUnits("2000000", "18");
    const pilotMintedOnWallet = parseUnits("2000000", "18");

    await shibPilotVault.init();
    const a = await shibPilotVault
      .connect(wallet)
      .callStatic.deposit(parseUnits("10000", "18"), parseUnits("80000", "18"));

    console.log("deposited", a);
    await shibPilotVault
      .connect(wallet)
      .deposit(parseUnits("10000", "18"), parseUnits("80000", "18"));

    const lpBalance: BigNumber = await shibPilotVault
      .connect(wallet)
      .balanceOf(wallet.address);

    await generateFeeThroughSwap(swapRouter, alice, PILOT, SHIB, "2000");

    const calculatedFees = await parseUnits("2000", "18")
      .mul(parseUnits("0.3", "18"))
      .div(parseUnits("100", "18"));

    console.log("calculated fees", calculatedFees);
    const fees = await shibPilotVault.callStatic.getPositionDetails();
    console.log("feeses", fees);

    expect(fees[2]).to.be.equal(calculatedFees.div(parseUnits("1", "18")));

    const withdrawFunds = await shibPilotVault.callStatic.withdraw(
      lpBalance,
      wallet.address,
    );
    console.log("withdrawFunds", withdrawFunds);

    await shibPilotVault.withdraw(lpBalance, wallet.address);

    const newPilotBalance: BigNumber = await PILOT.balanceOf(wallet.address);
    const newShibBalance: BigNumber = await SHIB.balanceOf(wallet.address);

    console.log("newPilotBalance", newPilotBalance);
    console.log("newShibBalance", newShibBalance);

    const pilotBalanceAfterWithdraw =
      pilotBalanceBeforeDeposit.add(calculatedFees);

    expect(newPilotBalance).to.be.equal(pilotBalanceAfterWithdraw);
    expect(newShibBalance).to.be.equal(shibBalanceBeforeDeposit);
  });
}
