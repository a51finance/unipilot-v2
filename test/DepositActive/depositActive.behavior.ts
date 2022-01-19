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
import { IUniswapV3Pool, NonfungiblePositionManager } from "../../typechain";
export async function shouldBehaveLikeDeposit(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
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

  let governance = wallet;

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
      PILOT,
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

  it("Testing Factory : Owner should governor", async () => {
    console.log(
      "************************ FACTORY CONTRACT TESTING **********************************",
    );

    let data = await unipilotFactory.getUnipilotDetails();
    // console.log(await unipilotFactory.connect(wallet).governance());

    expect(data[0]).to.equal(governance.address);
    console.log("Governance address: ", data[0]);
  });

  it("Testing Factory : Should revert, set new owner", async () => {
    // let tx = await unipilotFactory.connect(other).setGovernance(wallet.address);
    await expect(
      unipilotFactory.connect(other).setGovernance(wallet.address),
    ).to.be.revertedWith("NG");
  });

  it("Testing Factory : Should set new owner", async () => {
    let receipt = await unipilotFactory
      .connect(wallet)
      .setGovernance(other.address, {
        gasLimit: "3000000",
      });
    console.log("Tx hash", receipt.hash);
    let data = await unipilotFactory.getUnipilotDetails();
    // console.log(await unipilotFactory.connect(wallet).governance());

    expect(data[0]).to.equal(other.address);
    console.log("New Governance address: ", data[0]);
  });

  it("Testing Factory : Should create pool with 1% fee tier", async () => {
    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 10000);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      10000,
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .createVault(
        DAI.address,
        USDT.address,
        10000,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );
    await expect(vault).to.be.ok;
  });

  it("Testing Factory : Should create pool with 0.05% fee tier", async () => {
    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      500,
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .createVault(
        DAI.address,
        USDT.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );
    await expect(vault).to.be.ok;
  });

  it("Testing Factory : Should create pool with 0.05% fee tier", async () => {
    console.log("Create Pool in reverse");
    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    await uniswapV3Factory.createPool(USDT.address, DAI.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      USDT.address,
      DAI.address,
      500,
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .createVault(
        USDT.address,
        DAI.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );
    await expect(vault).to.be.ok;
  });

  it("Testing Factory : Should create with 0.3% fee tier but revert (already Exist)", async () => {
    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    await expect(
      unipilotFactory
        .connect(governance)
        .createVault(
          DAI.address,
          USDT.address,
          3000,
          encodedPrice,
          "unipilot PILOT-USDT",
          "PILOT-USDT",
        ),
    ).to.be.revertedWith("VE");
  });

  it("Testing Factory : Should fail, same token address", async () => {
    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      DAI.address,
      500,
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    await expect(
      unipilotFactory
        .connect(governance)
        .createVault(
          DAI.address,
          DAI.address,
          500,
          encodedPrice,
          "unipilot PILOT-USDT",
          "PILOT-USDT",
        ),
    ).to.be.revertedWith("TE");
  });

  it("Testing Factory : Pool should not whitelisted but include after run ", async () => {
    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      500,
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .callStatic.createVault(
        DAI.address,
        USDT.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );

    await unipilotFactory
      .connect(governance)
      .createVault(
        DAI.address,
        USDT.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );

    let receipt = await unipilotFactory.getVaults(
      DAI.address,
      USDT.address,
      500,
    );
    console.log("1. receipt ::", receipt._whitelisted);
    expect(receipt._whitelisted).to.be.equals(false);

    await unipilotFactory.connect(governance).whitelistVaults([vault[0]]);
    receipt = await unipilotFactory.getVaults(DAI.address, USDT.address, 500);
    console.log("2. receipt ::", receipt._whitelisted);
    expect(receipt._whitelisted).to.be.equals(true);

    console.log(
      "*********************FACTORY TEST COMPLETE**********************",
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

    expect(
      await unipilotVault
        .connect(wallet)
        .deposit(parseUnits("1000", "18"), parseUnits("1000", "18")),
    ).to.be.ok;

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

  it("Deposit separate Active", async () => {
    expect(
      await unipilotVault.deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
      ),
    );
  });
}
