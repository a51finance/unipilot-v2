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
  AlgebraPool,
  NonfungiblePositionManager,
  UnipilotActiveVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";
import hre from "hardhat";
export async function shouldBehaveLikeDepositActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotActiveVault;
  let DAI: Contract;
  let USDT: Contract;
  let algebraPool: AlgebraPool;
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
      createVault,
    } = await loadFixture(unipilotActiveVaultFixture));
    const tx = await uniswapV3Factory.createPool(DAI.address, USDT.address);
    let daiUsdtPoolAddress = await uniswapV3Factory.poolByPair(
      DAI.address,
      USDT.address,
    );

    algebraPool = (await ethers.getContractAt(
      "AlgebraPool",
      daiUsdtPoolAddress,
    )) as AlgebraPool;

    await algebraPool.initialize(encodedPrice);
    await uniStrategy.setBaseTicks([daiUsdtPoolAddress], [0], [100]);

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

    await USDT.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(bob).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(bob).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(carol).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(carol).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(user0).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(user0).approve(unipilotVault.address, MaxUint256);

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

    await uniswapV3PositionManager.connect(wallet).mint(
      {
        token0: token0,
        token1: token1,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        amount0Desired: parseUnits("100000", "18"),
        amount1Desired: parseUnits("100000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        recipient: wallet.address,
        deadline: 2000000000,
      },
      {
        value: 0,
        gasLimit: "3000000",
      },
    );

    await unipilotVault.toggleOperator(wallet.address);
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

    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    const token0Balance: BigNumber = await token0Instance.balanceOf(
      wallet.address,
    );
    const token1Balance: BigNumber = await token1Instance.balanceOf(
      wallet.address,
    );
  });

  it("should successfully predict amounts after deposit", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    await unipilotVault.readjustLiquidity(50);
    await hre.network.provider.send("evm_increaseTime", [3600]);
    await hre.network.provider.send("evm_mine");
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    const token0MintedOnWallet0 = parseUnits("2000000", "18");

    const mintedToken0OnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedToken0BalanceBeforeDeposit = token0MintedOnWallet0.sub(
      mintedToken0OnUniswap,
    );

    const token0ToBeDesposited = parseUnits("2000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("1", "18"));

    const expectedToken0BalanceAfterDeposit =
      expectedToken0BalanceBeforeDeposit.sub(token0ToBeDesposited);

    const token1MintedOnWallet0 = parseUnits("2000000", "18");

    const mintedToken1OnUniswap = parseUnits("5000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18"));

    const expectedToken1BalanceBeforeDeposit = token1MintedOnWallet0.sub(
      mintedToken1OnUniswap,
    ); // 1995000

    const token1ToBeDesposited = parseUnits("2000", "18")
      .mul(parseUnits("1", "18"))
      .div(parseUnits("8", "18")); //

    const expectedToken1BalanceAfterDeposit =
      expectedToken1BalanceBeforeDeposit.sub(token1ToBeDesposited); //1994875

    const token0Balance: BigNumber = await token0Instance.balanceOf(
      wallet.address,
    );
    const token1Balance: BigNumber = await token1Instance.balanceOf(
      wallet.address,
    );

    expect(
      token0Balance.gt(parseUnits("1898000", "18")) &&
        token0Balance.lt(parseUnits("1898001", "18")),
    ).to.be.true;

    expect(
      token1Balance.gt(parseUnits("1986371", "18")) &&
        token1Balance.lt(parseUnits("1986372", "18")),
    ).to.be.true;
  });

  it("fees calculation", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("10000", "18"),
        parseUnits("80000", "18"),
        wallet.address,
      );

    await generateFeeThroughSwap(swapRouter, alice, USDT, DAI, "2000");

    const calculatedFees = parseUnits("2000", "18")
      .mul(parseUnits("0.3", "18"))
      .div(parseUnits("100", "18"));

    const fees = await unipilotVault.callStatic.getPositionDetails();

    expect(fees[2]).to.be.lte(calculatedFees);
  });

  it("Should deposit proportionally with pool reserves", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

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
    const tokenAmount = 10000;

    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(tokenAmount, tokenAmount, wallet.address);

    await unipilotVault
      .connect(bob)
      .deposit(tokenAmount, tokenAmount, bob.address);

    await unipilotVault
      .connect(carol)
      .deposit(tokenAmount, tokenAmount, carol.address);

    await generateFeeThroughSwap(
      swapRouter,
      wallet,
      token0Instance,
      token1Instance,
      "5000",
    );

    await hre.network.provider.send("evm_increaseTime", [3600]);

    await unipilotVault
      .connect(user0)
      .deposit(tokenAmount + 5000, tokenAmount + 5000, user0.address);

    const lpBalanceOfCarol = await unipilotVault.balanceOf(carol.address);
    const lpBalanceOfUser0 = await unipilotVault.balanceOf(user0.address);

    const lpBalanceOfBob = await unipilotVault.balanceOf(bob.address);
    const lpBalanceOfWallet = await unipilotVault.balanceOf(wallet.address);

    expect(lpBalanceOfWallet).to.be.eq(tokenAmount);
    expect(lpBalanceOfBob).to.be.eq(tokenAmount + 1);
    expect(lpBalanceOfCarol).to.be.eq(tokenAmount + 1);
    expect(lpBalanceOfUser0).to.be.eq(tokenAmount + 4288);
  });

  it("should pull liquidity successfully", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    const token0BalanceAfterDeposit: BigNumber = await token0Instance.balanceOf(
      unipilotVault.address,
    );
    const token1BalanceAfterDeposit: BigNumber = await token1Instance.balanceOf(
      unipilotVault.address,
    );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const token0VaultBalance = positionDetails[0];
    const token1VaultBalance = positionDetails[1];

    await unipilotVault.connect(wallet).pullLiquidity();
    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const token0Balance: BigNumber = await token0Instance.balanceOf(
      unipilotVault.address,
    );
    const token1Balance: BigNumber = await token1Instance.balanceOf(
      unipilotVault.address,
    );

    expect(positionDetails[0]).to.be.equal(0);
    expect(positionDetails[1]).to.be.equal(0);

    expect(token0Balance.sub(token0BalanceAfterDeposit)).to.be.equal(
      token0VaultBalance,
    );
    expect(token1Balance.sub(token1BalanceAfterDeposit)).to.be.equal(
      token1VaultBalance,
    );
  });

  it("should push liquidity back successfully", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault
    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    const token0BalanceAfterDeposit: BigNumber = await token0Instance.balanceOf(
      unipilotVault.address,
    );
    const token1BalanceAfterDeposit: BigNumber = await token1Instance.balanceOf(
      unipilotVault.address,
    );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const token0VaultBalance = positionDetails[0];
    const token1VaultBalance = positionDetails[1];

    await unipilotVault.connect(wallet).pullLiquidity();

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    let token0Balance: BigNumber = await token0Instance.balanceOf(
      unipilotVault.address,
    );
    let token1Balance: BigNumber = await token1Instance.balanceOf(
      unipilotVault.address,
    );

    expect(positionDetails[0]).to.be.equal(0);
    expect(positionDetails[1]).to.be.equal(0);

    expect(token0Balance.sub(token0BalanceAfterDeposit)).to.be.equal(
      token0VaultBalance,
    );
    expect(token1Balance.sub(token1BalanceAfterDeposit)).to.be.equal(
      token1VaultBalance,
    );

    await unipilotVault.readjustLiquidity(50);

    token0Balance = await token0Instance.balanceOf(unipilotVault.address);
    token1Balance = await token1Instance.balanceOf(unipilotVault.address);

    expect(token1Balance).to.be.equal(0);
  });

  it("should deposit after pull liquidity", async () => {
    await unipilotVault.rebalance(0, false, getMinTick(60), getMaxTick(60)); // initializing vault

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    const token0BalanceAfterDeposit: BigNumber = await token0Instance.balanceOf(
      unipilotVault.address,
    ); //dust
    const token1BalanceAfterDeposit: BigNumber = await token1Instance.balanceOf(
      unipilotVault.address,
    ); //dust

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const token0VaultBalance = positionDetails[0]; //actual deposited
    const token1VaultBalance = positionDetails[1]; //actual deposited

    await unipilotVault.connect(wallet).pullLiquidity();

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[0]).to.be.equal(0);
    expect(positionDetails[1]).to.be.equal(0);

    let token0Balance: BigNumber = await token0Instance.balanceOf(
      unipilotVault.address,
    );
    let token1Balance: BigNumber = await token1Instance.balanceOf(
      unipilotVault.address,
    );

    expect(token0Balance.sub(token0BalanceAfterDeposit)).to.be.equal(
      token0VaultBalance,
    );
    expect(token1Balance.sub(token1BalanceAfterDeposit)).to.be.equal(
      token1VaultBalance,
    );

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
      );

    positionDetails = await unipilotVault.callStatic.getPositionDetails();

    expect(positionDetails[0]).to.be.equal(0);
    expect(positionDetails[1]).to.be.equal(0);

    let token0BalanceAfterSecondDeposit: BigNumber =
      await token0Instance.balanceOf(unipilotVault.address);

    let token1BalanceAfterSecondDeposit: BigNumber =
      await token1Instance.balanceOf(unipilotVault.address);

    expect(token0BalanceAfterSecondDeposit).to.be.gt(token0Balance);
    expect(token1BalanceAfterSecondDeposit).to.be.gt(token1Balance);

    const lpToWithdraw = parseUnits("2", "18");
    await unipilotVault.withdraw(lpToWithdraw, wallet.address, false);

    await unipilotVault.readjustLiquidity(50);
  });
}
