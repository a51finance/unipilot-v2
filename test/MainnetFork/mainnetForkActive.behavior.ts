const hre = require("hardhat");

import { expect } from "chai";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotPassiveVault,
  UnipilotActiveFactory,
  UnipilotPassiveFactory,
  UnipilotActiveVault,
} from "../../typechain";
import ERC20Artifact from "../../artifacts/contracts/test/ERC20.sol/ERC20.json";
import WETH9Artifact from "uniswap-v3-deploy-plugin/src/util/WETH9.json";
// import SwapRouter from "../../artifacts/contracts/test/SwapRouter.sol/SwapRouter.json";

import SwapRouterArtifact from "../utils/MainnetSwapRouterJson/SwapRouter.json";
import {
  deployActiveFactory,
  deployPassiveFactory,
  deployStrategy,
} from "../stubs";
import { shouldBehaveLikePassiveLive } from "./mainnetForkPassive.behavior";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeActiveLive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: UnipilotActiveFactory;
  let swapRouter: Contract;
  // let unipilotVault: UnipilotActiveVault;
  // let shibPilotVault: UnipilotActiveVault;
  let wbtcUSDC: ContractFactory;
  let unipilotVault: UnipilotActiveVault;
  let wbtcUSDCVault: string;
  let SHIB: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let WETH: Contract;
  let USDT: Contract;
  let USDC: Contract;
  let WBTC: Contract;
  let daiUsdtUniswapPool: UniswapV3Pool;
  let shibPilotUniswapPool: UniswapV3Pool;
  let owner: any;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "8"),
    parseUnits("42244.5", "6"),
  );

  beforeEach("Fork Begin", async () => {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.FORK}`,
            blockNumber: 12724774,
          },
        },
      ],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2"],
    });
    //vitalik 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
    //Hacker 0xB3764761E297D6f121e79C32A65829Cd1dDb4D32
    owner = await ethers.getSigner(
      "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2",
    );

    USDT = await ethers.getContractAt(
      ERC20Artifact.abi,
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    );
    WBTC = await ethers.getContractAt(
      ERC20Artifact.abi,
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    );

    USDC = await ethers.getContractAt(
      ERC20Artifact.abi,
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );

    swapRouter = await ethers.getContractAt(
      SwapRouterArtifact.abi,
      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    );

    uniStrategy = await deployStrategy(owner);

    unipilotFactory = await deployActiveFactory(
      owner,
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      owner.address,
      uniStrategy.address,
      owner.address,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      10,
    );

    await uniStrategy.setBaseTicks(
      ["0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35"],
      [1800],
    );

    await unipilotFactory
      .connect(owner)
      .createVault(
        WBTC.address,
        USDC.address,
        "3000",
        encodedPrice,
        "WBTC-USDC-3000",
        "WBTC-USDC",
      );

    wbtcUSDCVault = await unipilotFactory.vaults(
      WBTC.address,
      USDC.address,
      "3000",
    );

    wbtcUSDC = await ethers.getContractFactory("UnipilotActiveVault");
    unipilotVault = wbtcUSDC.attach(wbtcUSDCVault) as UnipilotActiveVault;
    await unipilotVault.connect(owner).init();

    await WBTC.connect(owner).approve(unipilotVault.address, MaxUint256);
    await USDC.connect(owner).approve(unipilotVault.address, MaxUint256);
    await WBTC.connect(owner).approve(swapRouter.address, MaxUint256);
    await USDC.connect(owner).approve(swapRouter.address, MaxUint256);
    // await generateFeeThroughSwap(swapRouter, owner, DAI, WETH, "100");
  });

  it("Mainnet Deployments Test", async () => {
    const walletBalancePrior = await ethers.provider.getBalance(owner.address);
    let wbtc = await WBTC.balanceOf(owner.address);
    console.log("WBTC bal", wbtc);
    console.log("Balance Of signer is: ", walletBalancePrior);

    console.log("uniStrategy", uniStrategy.address);

    console.log("Swap Router", swapRouter.address);

    let ticksData = await unipilotVault.ticksData();
    console.log("ticksData", ticksData);

    console.log("unipilotFactory", unipilotFactory.address);

    console.log("wbtcUSDC vault", wbtcUSDCVault);
  });
  it("Should be deposit", async () => {
    let tx = await unipilotVault.connect(owner).deposit(
      parseUnits("1", "8"),
      parseUnits("40000", "6"),
      owner.address,
      //  {
      //   value: parseUnits("1", "18"),
      // }
    );
    console.log("Tx hash", tx.hash);
    expect(await unipilotVault.balanceOf(owner.address)).to.be.gt(0);
  });
  it("Should be readjust", async () => {
    await unipilotVault
      .connect(owner)
      .deposit(parseUnits("1", "8"), parseUnits("40000", "6"), owner.address);

    await generateFeeThroughSwap(swapRouter, owner, WBTC, USDC, "1000");

    let tx = await unipilotVault.connect(owner).readjustLiquidity();
    console.log("Tx hash", tx.hash);
  });

  it("Should be withdraw", async () => {
    await unipilotVault
      .connect(owner)
      .deposit(parseUnits("1", "8"), parseUnits("40000", "6"), owner.address);
    let liquidity = await unipilotVault.balanceOf(owner.address);
    console.log(liquidity);

    let tx = await unipilotVault
      .connect(owner)
      .withdraw(liquidity, owner.address, false);
    console.log("Tx hash", tx.hash);
    expect(await unipilotVault.balanceOf(owner.address)).to.be.equal(0);
  });

  // shouldBehaveLikePassiveLive();
}
