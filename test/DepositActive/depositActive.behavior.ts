import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotActiveVaultFixture,
} from "../utils/fixuresActive";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotActiveVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeDepositActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotActiveVault;
  let shibPilotVault: UnipilotActiveVault;
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
    ReturnType<typeof unipilotActiveVaultFixture>
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
    } = await loadFixture(unipilotActiveVaultFixture));

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

    await USDT._mint(wallet.address, parseUnits("2000000", "18"));
    await DAI._mint(wallet.address, parseUnits("2000000", "18"));

    await USDT.connect(bob)._mint(bob.address, parseUnits("2000000", "18"));
    await DAI.connect(bob)._mint(bob.address, parseUnits("2000000", "18"));

    await USDT.connect(carol)._mint(carol.address, parseUnits("2000000", "18"));
    await DAI.connect(carol)._mint(carol.address, parseUnits("2000000", "18"));

    await USDT.connect(user0)._mint(user0.address, parseUnits("2000000", "18"));
    await DAI.connect(user0)._mint(user0.address, parseUnits("2000000", "18"));

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

    await USDT.connect(bob).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(bob).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(carol).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(carol).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(user0).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(user0).approve(unipilotVault.address, MaxUint256);

    await SHIB.connect(wallet).approve(shibPilotVault.address, MaxUint256);
    await PILOT.connect(wallet).approve(shibPilotVault.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(swapRouter.address, MaxUint256);

    await SHIB.connect(wallet).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(wallet).approve(swapRouter.address, MaxUint256);

    await SHIB.connect(alice).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(alice).approve(swapRouter.address, MaxUint256);

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
    const daiMintedOnWallet0 = parseUnits("2000000", "18");

    const mintedDaiOnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18"));

    const expectedDaiBalanceBeforeDeposit =
      daiMintedOnWallet0.sub(mintedDaiOnUniswap); // 1995000

    const daiToBeDesposited = parseUnits("1000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18")); // 125

    const expectedDaiBalanceAfterDeposit =
      expectedDaiBalanceBeforeDeposit.sub(daiToBeDesposited); //1994875

    await unipilotVault.init();
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

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
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    await unipilotVault.readjustLiquidity();

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

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

    expect(daiBalance).to.be.equal(expectedDaiBalanceAfterDeposit);
    expect(usdtBalance).to.be.equal(expectedUsdtBalanceAfterDeposit);
  });

  it("fees calculation", async () => {
    await shibPilotVault.init();
    const a = await shibPilotVault
      .connect(wallet)
      .callStatic.deposit(
        parseUnits("10000", "18"),
        parseUnits("80000", "18"),
        wallet.address,
      );

    await shibPilotVault
      .connect(wallet)
      .deposit(
        parseUnits("10000", "18"),
        parseUnits("80000", "18"),
        wallet.address,
      );

    const lpBalance: BigNumber = await shibPilotVault
      .connect(wallet)
      .balanceOf(wallet.address);

    await generateFeeThroughSwap(swapRouter, alice, PILOT, SHIB, "2000");

    const calculatedFees = await parseUnits("2000", "18")
      .mul(parseUnits("0.3", "18"))
      .div(parseUnits("100", "18"));

    const fees = await shibPilotVault.callStatic.getPositionDetails();

    expect(fees[2]).to.be.lte(calculatedFees);
  });

  it("Should deposit proportionally with pool reserves", async () => {
    await unipilotVault.init();
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );
    const positionDetails = await unipilotVault.callStatic.getPositionDetails();
    const reserve1 =
      positionDetails[0].lte(parseUnits("1000", "18")) &&
      positionDetails[0].gte(parseUnits("999", "18"));

    const reserve2 = positionDetails[0].gte(parseUnits("125", "18"));

    expect(reserve1 && reserve2).to.be.true;
  });

  it("should get lp according to share", async () => {
    await unipilotVault.init();
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    await unipilotVault
      .connect(bob)
      .deposit(parseUnits("1000", "18"), parseUnits("1000", "18"), bob.address);

    await unipilotVault
      .connect(carol)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        carol.address,
      );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    await generateFeeThroughSwap(swapRouter, wallet, USDT, DAI, "2000");

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    await unipilotVault
      .connect(user0)
      .deposit(
        parseUnits("4000", "18"),
        parseUnits("4000", "18"),
        user0.address,
      );

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const lpBalanceOfWallet = await unipilotVault.balanceOf(wallet.address);
    const lpBalanceOfBob = await unipilotVault.balanceOf(bob.address);
    const lpBalanceOfCarol = await unipilotVault.balanceOf(carol.address);
    const lpBalanceOfUser0 = await unipilotVault.balanceOf(user0.address);

    const walletLp =
      lpBalanceOfWallet.gte(parseUnits("1000", "18")) &&
      lpBalanceOfWallet.lt(parseUnits("1001", "18"));

    const bobLp =
      lpBalanceOfBob.gte(parseUnits("1000", "18")) &&
      lpBalanceOfBob.lt(parseUnits("1001", "18"));

    const carolLp =
      lpBalanceOfCarol.gte(parseUnits("1000", "18")) &&
      lpBalanceOfCarol.lt(parseUnits("1001", "18"));

    const user0Lp =
      lpBalanceOfUser0.gte(parseUnits("3198", "18")) &&
      lpBalanceOfUser0.lt(parseUnits("3201", "18"));
    expect(bobLp && walletLp && carolLp && user0Lp).to.be.true;
  });

  // it("should pull liquidity successfully", async () => {
  //   await unipilotVault.init();
  //   await unipilotVault
  //     .connect(wallet)
  //     .deposit(
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //     );

  //   const usdtBalanceAfterDeposit: BigNumber = await USDT.balanceOf(
  //     unipilotVault.address,
  //   );
  //   const daiBalanceAfterDeposit: BigNumber = await DAI.balanceOf(
  //     unipilotVault.address,
  //   );

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const usdtVaultBalance = positionDetails[0];
  //   const daiVaultBalance = positionDetails[1];
  //   console.log("position Details after deposit", positionDetails);

  //   await unipilotVault.connect(wallet).pullLiquidity();
  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const usdtBalance: BigNumber = await USDT.balanceOf(unipilotVault.address);
  //   const daiBalance: BigNumber = await DAI.balanceOf(unipilotVault.address);

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   expect(usdtBalance.sub(usdtBalanceAfterDeposit)).to.be.equal(
  //     usdtVaultBalance,
  //   );
  //   expect(daiBalance.sub(daiBalanceAfterDeposit)).to.be.equal(daiVaultBalance);
  // });

  // it("should push liquidity back successfully", async () => {
  //   await unipilotVault.init();
  //   await unipilotVault
  //     .connect(wallet)
  //     .deposit(
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //     );

  //   const usdtBalanceAfterDeposit: BigNumber = await USDT.balanceOf(
  //     unipilotVault.address,
  //   );
  //   const daiBalanceAfterDeposit: BigNumber = await DAI.balanceOf(
  //     unipilotVault.address,
  //   );

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const usdtVaultBalance = positionDetails[0];
  //   const daiVaultBalance = positionDetails[1];

  //   await unipilotVault.connect(wallet).pullLiquidity();
  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   let usdtBalance: BigNumber = await USDT.balanceOf(unipilotVault.address);
  //   let daiBalance: BigNumber = await DAI.balanceOf(unipilotVault.address);

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   expect(usdtBalance.sub(usdtBalanceAfterDeposit)).to.be.equal(
  //     usdtVaultBalance,
  //   );
  //   expect(daiBalance.sub(daiBalanceAfterDeposit)).to.be.equal(daiVaultBalance);

  //   await unipilotVault.readjustLiquidity();

  //   usdtBalance = await USDT.balanceOf(unipilotVault.address);
  //   daiBalance = await DAI.balanceOf(unipilotVault.address);

  //   expect(daiBalance).to.be.equal(0);
  // });
}
