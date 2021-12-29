import { expect, use } from "chai";
import { BigNumber, utils, Contract, ContractFactory } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
import {
  deployStrategy,
  deployUnipilotFactory,
  deployUnipilotVault,
  deployUniswapContracts,
  deployWETH9,
} from "./stubs";

import { solidity } from "ethereum-waffle";

import hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployPilot, deployToken } from "./TokenDeployer/TokenStubs";
import { createPoolOnUniswap } from "./UniswapInteractions/createPool";
import { shouldBehaveLikeUnipilotFunctions } from "./UnipilotFunctions/unipilotFunctions.behavior";
import { shouldBehaveLikeTokenApproval } from "./TokenApproval/tokenApprove.behavior";
import { parseUnits } from "@ethersproject/units";

use(solidity);

describe("Initializing the testing suite", async () => {
  let uniswapV3Factory: Contract;
  let uniswapPositionManager: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let uniStrategy: Contract;
  let WETH9: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDC: Contract;
  let USDT: Contract;
  let pool: string;
  let vault: string;
  let mockVault: Contract;
  let lpShares: any;
  let vaultSupply: any;
  let walletVaultSupply: any;
  before("Deploying the contracts", async () => {
    let [wallet0, wallet1] = await hre.ethers.getSigners();
    WETH9 = await deployWETH9(wallet0);

    DAI = await deployToken(wallet0, "Dai Stablecoin", "DAI", 18);
    USDC = await deployToken(wallet0, "Usdc", "USDC", 6);
    USDT = await deployToken(wallet0, "Tether Stable", "USDT", 6);
    let uniswapv3Contracts = await deployUniswapContracts(wallet0, WETH9);
    console.log(
      "uniswapv3COntracts factory",
      uniswapv3Contracts.factory.address,
    );
    uniswapV3Factory = uniswapv3Contracts.factory;
    uniStrategy = await deployStrategy(wallet0);
    unipilotFactory = await deployUnipilotFactory(
      wallet0,
      uniswapV3Factory.address,
      uniStrategy.address,
    );
    uniswapPositionManager = uniswapv3Contracts.positionManager;
    swapRouter = uniswapv3Contracts.router;

    PILOT = await deployPilot(wallet0);
    pool = await createPoolOnUniswap(
      wallet0,
      uniswapV3Factory,
      PILOT.address,
      USDT.address,
      3000,
      "42951287100",
    );
    // mockVault = await deployUnipilotVault(wallet0, pool, uniStrategy.address);
    // await PILOT.approve(mockVault.address, MaxUint256);
    // await USDT.approve(mockVault.address, MaxUint256);
    // // lpShares = await mockVault.deposit(
    // //   wallet0.address,
    // //   wallet0.address,
    // //   parseUnits("2", "18"),
    // //   parseUnits("2", "18"),
    // // );
    // vaultSupply = await mockVault.totalSupply();
    // // await shouldBehaveLikeTokenApproval(PILOT, mockVault.address);
    // // await shouldBehaveLikeTokenApproval(WETH9, mockVault.address);
    // // vault = await unipilotFactory.callStatic.createVault(
    // //   PILOT.address,
    // //   WETH9.address,
    // //   3000,
    // //   "79228162514264337593543950336",
    // // );
    // // await unipilotFactory.createVault(
    // //   PILOT.address,
    // //   WETH9.address,
    // //   3000,
    // //   "79228162514264337593543950336",
    // // );
  });
  describe("Running the pilot functions", async () => {
    it("Runs Unipilot Functions", async function () {
      console.log("WETH9", WETH9.address);
      console.log("UNISWAP FACTORY", uniswapV3Factory.address);
      console.log("USDT", USDT.address);
      console.log("POOL", pool);
      console.log("Unipilot Factory", unipilotFactory.address);
      console.log("Strategy", uniStrategy.address);
      // console.log("Vault name", (await mockVault.name()).toString());
      // console.log("Vault supply", (await vaultSupply).toString());
      // console.log("Vault symbol", (await mockVault.symbol()).toString());
      let [wallet0, wallet1, wallet2, wallet3] = await hre.ethers.getSigners();
      let wallets: SignerWithAddress[] = [wallet0, wallet1, wallet2, wallet3];
      await shouldBehaveLikeUnipilotFunctions(
        wallets,
        unipilotFactory,
        mockVault,
        uniswapV3Factory,
        WETH9,
        PILOT,
        pool,
      );
    });
  });
});
