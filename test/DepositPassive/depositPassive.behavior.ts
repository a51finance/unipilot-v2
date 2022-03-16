import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
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
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeDepositPassive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotPassiveVault;
  let DAI: Contract;
  let USDT: Contract;
  let WETH9: Contract;
  let SHIB: Contract;

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
      WETH9,
      SHIB,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotPassiveVaultFixture));

    await uniswapV3Factory.createPool(WETH9.address, SHIB.address, 3000);

    let wethUsdtPoolAddress = await uniswapV3Factory.getPool(
      WETH9.address,
      SHIB.address,
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
      SHIB.address,
      3000,
      encodedPrice,
      "unipilot WETH-SHIB",
      "WETH-SHIB",
    );

    await SHIB.connect(wallet)._mint(wallet.address, parseUnits("10000", "18"));
    await SHIB.connect(alice)._mint(alice.address, parseUnits("10000", "18"));

    await SHIB.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );
    await WETH9.connect(alice).approve(
      uniswapV3PositionManager.address,
      MaxUint256,
    );

    await SHIB.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await WETH9.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await SHIB.connect(wallet).approve(swapRouter.address, MaxUint256);
    await WETH9.connect(wallet).approve(swapRouter.address, MaxUint256);

    await SHIB.connect(wallet).approve(wethUsdtPoolAddress, MaxUint256);
    await WETH9.connect(wallet).approve(wethUsdtPoolAddress, MaxUint256);

    const token0 = SHIB.address < WETH9.address ? SHIB.address : WETH9.address;
    const token1 = SHIB.address > WETH9.address ? SHIB.address : WETH9.address;

    await uniswapV3PositionManager.connect(alice).mint(
      {
        token0: token0,
        token1: token1,
        tickLower: getMinTick(60),
        tickUpper: getMaxTick(60),
        fee: 3000,
        recipient: wallet.address,
        amount0Desired: parseUnits("1000", "18"),
        amount1Desired: parseUnits("1000", "18"),
        amount0Min: 0,
        amount1Min: 0,
        deadline: 2000000000,
      },
      {
        gasLimit: "3000000",
        value: parseUnits("1000", "18"),
      },
    );
  });

  it("checking name of vault LP Token", async () => {
    const vaultName = (await unipilotVault.name()).toString();
    expect(vaultName).to.be.equal("Unipilot Shiba Inu Wrapped Ether Vault");
  });

  it("checking symbol of vault LP Token", async () => {
    const vaultSymbol = (await unipilotVault.symbol()).toString();
    expect(vaultSymbol).to.be.equal("ULP-SHIB-WETH");
  });

  it("deposit suceed for eth", async () => {
    const ethBalanceBeforeDeposit = await wallet.getBalance();

    await unipilotVault
      .connect(wallet)
      .deposit(
        parseUnits("1000", "18"),
        parseUnits("1000", "18"),
        wallet.address,
        {
          value: parseUnits("1000", "18"),
        },
      );

    let positionDetails = await unipilotVault.callStatic.getPositionDetails();

    const ethBalanceAfterDeposit = await wallet.getBalance();

    const ethDeposited = ethBalanceBeforeDeposit.sub(ethBalanceAfterDeposit);

    expect(
      parseUnits("999", "18").lte(positionDetails[0]) &&
        positionDetails[0].lte(ethDeposited) &&
        ethDeposited.lt(parseUnits("1001", "18")),
    ).to.be.true;
  });

  // it("should push liquidity back successfully", async () => {
  //   await unipilotVault
  //     .connect(wallet)
  //     .deposit(
  //       parseUnits("1000", "18"),
  //       parseUnits("1000", "18"),
  //       wallet.address,
  //       {
  //         value: parseUnits("1000", "18"),
  //       },
  //     );

  //   const usdtBalanceAfterDeposit: BigNumber = await SHIB.balanceOf(
  //     unipilotVault.address,
  //   );
  //   const wethBalanceAfterDeposit: BigNumber = await WETH9.balanceOf(
  //     unipilotVault.address,
  //   );

  //   let positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   await unipilotVault.connect(wallet).pullLiquidity();
  //   positionDetails = await unipilotVault.callStatic.getPositionDetails();

  //   let usdtBalance: BigNumber = await USDT.balanceOf(unipilotVault.address);
  //   let wethBalance: BigNumber = await WETH9.balanceOf(unipilotVault.address);

  //   expect(positionDetails[0]).to.be.equal(0);
  //   expect(positionDetails[1]).to.be.equal(0);

  //   await unipilotVault.readjustLiquidity();

  //   usdtBalance = await USDT.balanceOf(unipilotVault.address);
  //   wethBalance = await DAI.balanceOf(unipilotVault.address);

  //   expect(wethBalance).to.be.equal(0);
  //   expect(usdtBalance).to.be.equal(0);
  // });
}
