import { expect, use } from "chai";
import { Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";

import { solidity } from "ethereum-waffle";

import { waffle, ethers } from "hardhat";

import { parseUnits } from "@ethersproject/units";
import { unipilotVaultFixture } from "./utils/fixtures";
import { encodePriceSqrt } from "./utils/encodePriceSqrt";
import { IUniswapV3Pool } from "../typechain";

use(solidity);

const createFixtureLoader = waffle.createFixtureLoader;

describe("Initializing the testing suite", async () => {
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: Contract;
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

    console.log("pool address", poolAddress);

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 3000);

    poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );

    console.log("pool address", poolAddress);

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

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    // await uniswapV3PositionManager.connect(wallet0).mint({
    //   token0: DAI.address,
    //   token1: USDT.address,
    //   tickLower: getMinTick(60),
    //   tickUpper: getMaxTick(60),
    //   fee: 3000,
    //   recipient: wallet0.address,
    //   amount0Desired: parseUnits("5000", "18"),
    //   amount1Desired: parseUnits("5000", "18"),
    //   amount0Min: 0,
    //   amount1Min: 0,
    //   deadline: 2000000000,
    // });

    console.log("unipilot vault address-->", unipilotVault.address);
  });

  it("checking name of vault LP Token", async () => {
    const vaultName = (await unipilotVault.name()).toString();
    console.log("Vault name", vaultName);
    expect(vaultName).to.be.equal("unipilot PILOT-USDT");
  });

  it("checking symbol of vault LP Token", async () => {
    const vaultSymbol = (await unipilotVault.symbol()).toString();
    console.log("Vault symbol", vaultSymbol);
    expect(vaultSymbol).to.be.equal("PILOT-USDT");
  });

  it("checking total supply of vault LP Token", async () => {
    const totalSupply = (await unipilotVault.totalSupply()).toString();
    console.log("Vault total Supply", totalSupply);
    expect(totalSupply).to.be.equal("0");
  });

  it("should give user balance of pilot and usdt before deposit", async () => {
    const daiBalance = await DAI.balanceOf(wallet.address);
    const usdtBalance = await USDT.balanceOf(wallet.address);

    console.log("Dai balance", daiBalance);
    console.log("Usdt balance", usdtBalance);

    expect(daiBalance).to.be.equal(parseUnits("2000000", "18"));
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
