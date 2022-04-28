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

export async function shouldBehaveLikeRouterDeposit(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotRouter: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotActiveVault;
  let DAI: Contract;
  let USDT: Contract;
  let uniswapPool: UniswapV3Pool;
  let token0Instance: Contract;
  let token1Instance: Contract;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("8", "18"),
  );

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

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
      uniStrategy,
      unipilotRouter,
      createVault,
    } = await loadFixture(unipilotActiveVaultFixture));

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 3000);

    let daiUsdtPoolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );

    uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      daiUsdtPoolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([daiUsdtPoolAddress], [100]);

    unipilotVault = await createVault(
      USDT.address,
      DAI.address,
      3000,
      encodedPrice,
      "unipilot USDT-DAI",
      "USDT-DAI",
    );

    await USDT._mint(wallet.address, parseUnits("2000000", "18"));
    await DAI._mint(wallet.address, parseUnits("2000000", "18"));

    await USDT.connect(bob)._mint(bob.address, parseUnits("2000000", "18"));
    await DAI.connect(bob)._mint(bob.address, parseUnits("2000000", "18"));

    await USDT.connect(alice)._mint(alice.address, parseUnits("2000000", "18"));
    await DAI.connect(alice)._mint(alice.address, parseUnits("2000000", "18"));

    await USDT.connect(carol)._mint(carol.address, parseUnits("2000000", "18"));
    await DAI.connect(carol)._mint(carol.address, parseUnits("2000000", "18"));

    await USDT.connect(user0)._mint(user0.address, parseUnits("2000000", "18"));
    await DAI.connect(user0)._mint(user0.address, parseUnits("2000000", "18"));

    await DAI.approve(uniswapV3PositionManager.address, MaxUint256);
    await USDT.approve(uniswapV3PositionManager.address, MaxUint256);

    await USDT.connect(wallet).approve(unipilotRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(unipilotRouter.address, MaxUint256);

    await USDT.connect(bob).approve(unipilotRouter.address, MaxUint256);
    await DAI.connect(bob).approve(unipilotRouter.address, MaxUint256);

    await USDT.connect(carol).approve(unipilotRouter.address, MaxUint256);
    await DAI.connect(carol).approve(unipilotRouter.address, MaxUint256);

    await USDT.connect(user0).approve(unipilotRouter.address, MaxUint256);
    await DAI.connect(user0).approve(unipilotRouter.address, MaxUint256);

    await USDT.connect(alice).approve(swapRouter.address, MaxUint256);
    await DAI.connect(alice).approve(swapRouter.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(swapRouter.address, MaxUint256);

    const token0 =
      USDT.address.toLowerCase() < DAI.address.toLowerCase()
        ? USDT.address.toLowerCase()
        : DAI.address.toLowerCase();

    const token1 =
      USDT.address.toLowerCase() > DAI.address.toLowerCase()
        ? USDT.address.toLowerCase()
        : DAI.address.toLowerCase();

    token0Instance =
      USDT.address.toLowerCase() < DAI.address.toLowerCase() ? USDT : DAI;

    token1Instance =
      USDT.address.toLowerCase() > DAI.address.toLowerCase() ? USDT : DAI;

    // await uniswapV3PositionManager.connect(wallet).mint(
    //   {
    //     token0: token0,
    //     token1: token1,
    //     tickLower: getMinTick(60),
    //     tickUpper: getMaxTick(60),
    //     fee: 3000,
    //     recipient: wallet.address,
    //     amount0Desired: parseUnits("100000", "18"),
    //     amount1Desired: parseUnits("100000", "18"),
    //     amount0Min: 0,
    //     amount1Min: 0,
    //     deadline: 2000000000,
    //   },
    //   {
    //     gasLimit: "3000000",
    //   },
    // );

    await uniswapV3PositionManager.connect(wallet).mint(
      {
        token0: token0,
        token1: token1,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet.address,
        amount0Desired: parseUnits("5", "18"),
        amount1Desired: parseUnits("50000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
      },
    );

    await unipilotFactory.toggleWhitelistAccount(unipilotVault.address);
  });

  it("checking name of vault LP Token", async () => {
    const vaultName = (await unipilotVault.name()).toString();
    expect(vaultName).to.be.equal("unipilot USDT-DAI");
  });

  it("checking symbol of vault LP Token", async () => {
    const vaultSymbol = (await unipilotVault.symbol()).toString();
    expect(vaultSymbol).to.be.equal("USDT-DAI");
  });

  it("checking total supply of vault LP Token", async () => {
    const totalSupply = (await unipilotVault.totalSupply()).toString();
    expect(totalSupply).to.be.equal("0");
  });

  it("should successfully deposit", async () => {
    const token0MintedOnWallet0 = parseUnits("2000000", "18");

    const mintedToken0OnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedUsdtBalanceBeforeDeposit = token0MintedOnWallet0.sub(
      mintedToken0OnUniswap,
    );

    const token0ToBeDesposited = parseUnits("1000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedUsdtBalanceAfterDeposit =
      expectedUsdtBalanceBeforeDeposit.sub(token0ToBeDesposited);

    const token1MintedOnWallet0 = parseUnits("2000000", "18");

    const mintedToken1OnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18"));

    const expectedDaiBalanceBeforeDeposit = token1MintedOnWallet0.sub(
      mintedToken1OnUniswap,
    ); // 1995000

    const token1ToBeDesposited = parseUnits("1000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18")); // 125

    const expectedToken1BalanceAfterDeposit =
      expectedDaiBalanceBeforeDeposit.sub(token1ToBeDesposited); //1994875

    await unipilotVault.init();
    // await unipilotRouter
    //   .connect(wallet)
    //   .deposit(
    //     uniswapPool.address,
    //     unipilotVault.address,
    //     parseUnits("1000", "18"),
    //     parseUnits("1000", "18"),
    //     wallet.address,
    //     true,
    //   );

    await unipilotRouter
      .connect(wallet)
      .deposit([
        uniswapPool.address,
        unipilotVault.address,
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
        parseUnits("1", "18"),
        parseUnits("1", "18"),
        true,
      ]);

    const token0Balance: BigNumber = await token0Instance.balanceOf(
      wallet.address,
    );
    const token1Balance: BigNumber = await token1Instance.balanceOf(
      wallet.address,
    );
  });

  // it("should successfully predict amounts after deposit", async () => {
  //   await unipilotVault.init();
  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   await unipilotVault.readjustLiquidity();

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   const token0MintedOnWallet0 = parseUnits("2000000", "18");

  //   const mintedToken0OnUniswap = parseUnits("5000", "18")
  //     .mul(parseUnits("1", "18"))
  //     .div(parseUnits("1", "18"));

  //   const expectedToken0BalanceBeforeDeposit = token0MintedOnWallet0.sub(
  //     mintedToken0OnUniswap,
  //   );

  //   const token0ToBeDesposited = parseUnits("2000", "18")
  //     .mul(parseUnits("1", "18"))
  //     .div(parseUnits("1", "18"));

  //   const expectedToken0BalanceAfterDeposit =
  //     expectedToken0BalanceBeforeDeposit.sub(token0ToBeDesposited);

  //   const token1MintedOnWallet0 = parseUnits("2000000", "18");

  //   const mintedToken1OnUniswap = parseUnits("5000", "18")
  //     .mul(parseUnits("1", "18"))
  //     .div(parseUnits("8", "18"));

  //   const expectedToken1BalanceBeforeDeposit = token1MintedOnWallet0.sub(
  //     mintedToken1OnUniswap,
  //   ); // 1995000

  //   const token1ToBeDesposited = parseUnits("2000", "18")
  //     .mul(parseUnits("1", "18"))
  //     .div(parseUnits("8", "18")); // 125

  //   const expectedToken1BalanceAfterDeposit =
  //     expectedToken1BalanceBeforeDeposit.sub(token1ToBeDesposited); //1994875

  //   const token0Balance: BigNumber = await token0Instance.balanceOf(
  //     wallet.address,
  //   );
  //   const token1Balance: BigNumber = await token1Instance.balanceOf(
  //     wallet.address,
  //   );

  //   // expect(
  //   //   token0Balance.gt(parseUnits("1898000", "18")) &&
  //   //     token0Balance.lt(parseUnits("1898001", "18")),
  //   // ).to.be.true;

  //   // expect(
  //   //   token1Balance.gt(parseUnits("1986371", "18")) &&
  //   //     token1Balance.lt(parseUnits("1986372", "18")),
  //   // ).to.be.true;
  // });

  // it("fees calculation", async () => {
  //   await unipilotVault.init();

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("10000", "18"),
  //       parseUnits("80000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   await generateFeeThroughSwap(
  //     swapRouter,
  //     alice,
  //     token0Instance,
  //     token1Instance,
  //     "2000",
  //   );

  //   const calculatedFees = parseUnits("2000", "18")
  //     .mul(parseUnits("0.3", "18"))
  //     .div(parseUnits("100", "18"));

  //   const fees = await unipilotVault.callStatic.getPositionDetails();

  //   expect(fees[2]).to.be.lte(calculatedFees);
  // });

  // it("Should deposit proportionally with pool reserves", async () => {
  //   await unipilotVault.init();

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   const positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const reserve1 =
  //     positionDetails[0].lte(parseUnits("1000", "18")) &&
  //     positionDetails[0].gte(parseUnits("999", "18"));

  //   const reserve2 = positionDetails[0].gte(parseUnits("125", "18"));

  //   expect(reserve1 && reserve2).to.be.true;
  // });

  // it("should get lp according to share", async () => {
  //   await unipilotVault.init();

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   await unipilotRouter
  //     .connect(bob)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       bob.address,
  //       true
  //     );

  //   await unipilotRouter
  //     .connect(carol)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       carol.address,
  //       true
  //     );

  //   await generateFeeThroughSwap(
  //     swapRouter,
  //     wallet,
  //     token0Instance,
  //     token1Instance,
  //     "2000",
  //   );

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   await unipilotRouter
  //     .connect(user0)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("4000", "18"),
  //       parseUnits("4000", "18"),
  //       user0.address,
  //       true
  //     );

  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const lpBalanceOfWallet = await unipilotVault.balanceOf(wallet.address);
  //   const lpBalanceOfBob = await unipilotVault.balanceOf(bob.address);
  //   const lpBalanceOfCarol = await unipilotVault.balanceOf(carol.address);
  //   const lpBalanceOfUser0 = await unipilotVault.balanceOf(user0.address);

  //   const walletLp =
  //     lpBalanceOfWallet.gte(parseUnits("1000", "18")) &&
  //     lpBalanceOfWallet.lt(parseUnits("1001", "18"));

  //   const bobLp =
  //     lpBalanceOfBob.gte(parseUnits("1000", "18")) &&
  //     lpBalanceOfBob.lt(parseUnits("1001", "18"));

  //   const carolLp =
  //     lpBalanceOfCarol.gte(parseUnits("1000", "18")) &&
  //     lpBalanceOfCarol.lt(parseUnits("1001", "18"));

  //   const user0Lp =
  //     lpBalanceOfUser0.gte(parseUnits("3198", "18")) &&
  //     lpBalanceOfUser0.lt(parseUnits("3841", "18"));

  //   expect(bobLp && walletLp && carolLp && user0Lp).to.be.true;
  // });

  // it("should pull liquidity successfully", async () => {
  //   await unipilotVault.init();

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   const token0BalanceAfterDeposit: BigNumber = await token0Instance.balanceOf(
  //     unipilotVault.address,
  //   );
  //   const token1BalanceAfterDeposit: BigNumber = await token1Instance.balanceOf(
  //     unipilotVault.address,
  //   );

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const token0VaultBalance = positionDetails[0];
  //   const token1VaultBalance = positionDetails[1];

  //   await unipilotVault.connect(wallet).pullLiquidity(unipilotVault.address);
  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const token0Balance: BigNumber = await token0Instance.balanceOf(
  //     unipilotVault.address,
  //   );
  //   const token1Balance: BigNumber = await token1Instance.balanceOf(
  //     unipilotVault.address,
  //   );

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   expect(token0Balance.sub(token0BalanceAfterDeposit)).to.be.equal(
  //     token0VaultBalance,
  //   );
  //   expect(token1Balance.sub(token1BalanceAfterDeposit)).to.be.equal(
  //     token1VaultBalance,
  //   );
  // });

  // it("should push liquidity back successfully", async () => {
  //   await unipilotVault.init();
  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   const token0BalanceAfterDeposit: BigNumber = await token0Instance.balanceOf(
  //     unipilotVault.address,
  //   );
  //   const token1BalanceAfterDeposit: BigNumber = await token1Instance.balanceOf(
  //     unipilotVault.address,
  //   );

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const token0VaultBalance = positionDetails[0];
  //   const token1VaultBalance = positionDetails[1];

  //   await unipilotVault.connect(wallet).pullLiquidity(unipilotVault.address);

  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   let token0Balance: BigNumber = await token0Instance.balanceOf(
  //     unipilotVault.address,
  //   );
  //   let token1Balance: BigNumber = await token1Instance.balanceOf(
  //     unipilotVault.address,
  //   );

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   expect(token0Balance.sub(token0BalanceAfterDeposit)).to.be.equal(
  //     token0VaultBalance,
  //   );
  //   expect(token1Balance.sub(token1BalanceAfterDeposit)).to.be.equal(
  //     token1VaultBalance,
  //   );

  //   await unipilotVault.readjustLiquidity();

  //   token0Balance = await token0Instance.balanceOf(unipilotVault.address);
  //   token1Balance = await token1Instance.balanceOf(unipilotVault.address);

  //   expect(token1Balance).to.be.equal(0);
  // });

  // it("should deposit after pull liquidity", async () => {
  //   await unipilotVault.init();

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   const token0BalanceAfterDeposit: BigNumber = await token0Instance.balanceOf(
  //     unipilotVault.address,
  //   ); //dust
  //   const token1BalanceAfterDeposit: BigNumber = await token1Instance.balanceOf(
  //     unipilotVault.address,
  //   ); //dust

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   const token0VaultBalance = positionDetails[0]; //actual deposited
  //   const token1VaultBalance = positionDetails[1]; //actual deposited

  //   await unipilotVault.connect(wallet).pullLiquidity(unipilotVault.address);

  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   let token0Balance: BigNumber = await token0Instance.balanceOf(
  //     unipilotVault.address,
  //   );
  //   let token1Balance: BigNumber = await token1Instance.balanceOf(
  //     unipilotVault.address,
  //   );

  //   expect(token0Balance.sub(token0BalanceAfterDeposit)).to.be.equal(
  //     token0VaultBalance,
  //   );
  //   expect(token1Balance.sub(token1BalanceAfterDeposit)).to.be.equal(
  //     token1VaultBalance,
  //   );

  //   await unipilotRouter
  //     .connect(wallet)
  //     .deposit(
  //       uniswapPool.address,
  //       unipilotVault.address,
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       true
  //     );

  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   let token0BalanceAfterSecondDeposit: BigNumber =
  //     await token0Instance.balanceOf(unipilotVault.address);

  //   let token1BalanceAfterSecondDeposit: BigNumber =
  //     await token1Instance.balanceOf(unipilotVault.address);

  //   expect(token0BalanceAfterSecondDeposit).to.be.gt(token0Balance);
  //   expect(token1BalanceAfterSecondDeposit).to.be.gt(token1Balance);

  //   const lpToWithdraw = parseUnits("2", "18");
  //   await unipilotVault.withdraw(lpToWithdraw, wallet.address, false);

  //   await unipilotVault.readjustLiquidity();
  // });

  it("Price Inflation", async () => {
    await unipilotVault.init();
    // await unipilotRouter
    //   .connect(wallet)
    //   .deposit(
    //     uniswapPool.address,
    //     unipilotVault.address,
    //     parseUnits("1000", "18"),
    //     parseUnits("1000", "18"),
    //     wallet.address,
    //     true,
    //   );

    await unipilotRouter
      .connect(wallet)
      .deposit([
        uniswapPool.address,
        unipilotVault.address,
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
        parseUnits("1", "18"),
        parseUnits("1", "18"),
        true,
      ]);

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();
    // console.log("before positionDetails", positionDetails);

    console.log(
      "Tick Before Swap",
      await unipilotVault.callStatic.currentTick(),
    );

    await generateFeeThroughSwap(
      swapRouter,
      alice,
      token0Instance,
      token1Instance,
      "1000",
    );

    await generateFeeThroughSwap(
      swapRouter,
      alice,
      token0Instance,
      token1Instance,
      "500",
    );

    await generateFeeThroughSwap(
      swapRouter,
      wallet,
      token0Instance,
      token1Instance,
      "4000",
    );

    positionDetails = await unipilotVault.callStatic.getPositionDetails();
    // console.log("after positionDetails", positionDetails);

    // await unipilotRouter
    //   .connect(wallet)
    //   .deposit(
    //     uniswapPool.address,
    //     unipilotVault.address,
    //     parseUnits("1000", "18"),
    //     parseUnits("1", "18"),
    //     wallet.address,
    //     true,
    //   );

    await unipilotRouter
      .connect(wallet)
      .deposit([
        uniswapPool.address,
        unipilotVault.address,
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
        parseUnits("100", "18"),
        parseUnits("100", "18"),
        true,
      ]);

    console.log(
      "Tick After Swap",
      await unipilotVault.callStatic.currentTick(),
    );
  });
}
