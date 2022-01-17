import { expect, use } from "chai";
import { Contract, Wallet } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
import {
  deployStrategy,
  deployUnipilotFactory,
  deployUnipilotRouter,
  deployUniswapContracts,
  deployWETH9,
} from "./stubs";

import { createFixtureLoader, solidity } from "ethereum-waffle";

import hre from "hardhat";

import { deployPilot, deployToken } from "./TokenDeployer/TokenStubs";
import { parseUnits } from "@ethersproject/units";
import { getMaxTick, getMinTick, unipilotVaultFixture } from "./utils/fixtures";
import { ethers } from "hardhat";
import { encodePriceSqrt } from "./utils/encodePriceSqrt";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IUniswapV3Pool } from "../typechain";

use(solidity);

describe("Initializing the testing suite", async () => {
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: Contract;
  let WETH9: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDC: Contract;
  let USDT: Contract;
  let uniswapPool: Contract;
  let wallet: Wallet, other: Wallet;
  let wallet0: SignerWithAddress,
    wallet1: SignerWithAddress,
    wallet2: SignerWithAddress;
  let wallets: SignerWithAddress[];
  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotVaultFixture>
  >["createVault"];

  before("fixtures deployer", async () => {
    [wallet, other] = await (ethers as any).getSigners();
    loadFixture = createFixtureLoader([wallet, other]);
    console.log("Before callled -->");
  });

  beforeEach("setting up fixture contracts", async () => {
    [wallet0, wallet1, wallet2] = await hre.ethers.getSigners();
    wallets = [wallet0, wallet1, wallet2];
    WETH9 = await deployWETH9(wallet0);

    DAI = await deployToken(wallet0, "Dai Stablecoin", "DAI", 18);
    USDC = await deployToken(wallet0, "Usdc", "USDC", 6);
    USDT = await deployToken(wallet0, "Tether Stable", "USDT", 18);
    PILOT = await deployPilot(wallet0);

    ({
      uniswapV3Factory,
      uniswapV3PositionManager,
      swapRouter,
      unipilotFactory,
      createVault,
    } = await loadFixture(unipilotVaultFixture));

    const encodedPrice = encodePriceSqrt(
      parseUnits("1", "18"),
      parseUnits("8", "18"),
    );
    unipilotVault = await createVault(
      USDT.address,
      DAI.address,
      3000,
      encodedPrice,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    await unipilotFactory
      .connect(wallet0)
      .whitelistVaults([unipilotVault.address]);

    await USDT._mint(wallet0.address, parseUnits("2000000", "18"));
    await DAI._mint(wallet0.address, parseUnits("2000000", "18"));

    await DAI.approve(uniswapV3PositionManager.address, MaxUint256);
    await USDT.approve(uniswapV3PositionManager.address, MaxUint256);

    await USDT.connect(wallets[0]).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(wallets[0]).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(wallets[0]).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallets[0]).approve(swapRouter.address, MaxUint256);

    const poolAddress = await uniswapV3Factory.getPool(
      USDT.address,
      DAI.address,
      3000,
    );
    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      poolAddress,
    )) as IUniswapV3Pool;

    await uniswapV3PositionManager.connect(wallet0).mint({
      token0: DAI.address,
      token1: USDT.address,
      tickLower: getMinTick(60),
      tickUpper: getMaxTick(60),
      fee: 3000,
      recipient: wallet0.address,
      amount0Desired: parseUnits("5000", "18"),
      amount1Desired: parseUnits("5000", "18"),
      amount0Min: 0,
      amount1Min: 0,
      deadline: 2000000000,
    });

    console.log("unipilot vault address-->", unipilotVault.address);
  });

  it("checking name of vault LP Token", async () => {
    const vaultName = (await unipilotVault.name()).toString();
    console.log("Vault name", vaultName);
    expect(vaultName).to.be.equal("unipilot PILOT-USDT");
  });

  it("checking name of vault LP Token", async () => {
    const vaultSymbol = (await unipilotVault.symbol()).toString();
    console.log("Vault symbol", vaultSymbol);
    expect(vaultSymbol).to.be.equal("PILOT-USDT");
  });

  it("checking name of vault LP Token", async () => {
    const totalSupply = (await unipilotVault.totalSupply()).toString();
    console.log("Vault total Supply", totalSupply);
    expect(totalSupply).to.be.equal("0");
  });

  it("should give user balance of pilot and usdt before deposit", async () => {
    const daiBalance = await DAI.balanceOf(wallets[0].address);
    const usdtBalance = await USDT.balanceOf(wallets[0].address);

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
