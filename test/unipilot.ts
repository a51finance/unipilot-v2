import { expect, use } from "chai";
import { BigNumber, utils, Contract, ContractFactory } from "ethers";

import {
  deployUnipilotRouter,
  deployUniswapContracts,
  deployWETH9,
} from "./stubs";

import { solidity } from "ethereum-waffle";

import hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { shouldBehaveLikeUnipilotRouterFunctions } from "./UnipilotRouterFunctions/unipilotRouterFunctions.behavior";

use(solidity);

describe("Initializing the testing suite", async () => {
  let uniswapV3Factory: Contract;
  let uniswapPositionManager: Contract;
  let swapRouter: Contract;
  let unipilotRouter: Contract;
  let WETH9: Contract;
  before("Deploying the contracts", async () => {
    let [wallet0] = await hre.ethers.getSigners();
    WETH9 = await deployWETH9(wallet0);
    let uniswapv3Contracts = await deployUniswapContracts(wallet0, WETH9);
    unipilotRouter = await deployUnipilotRouter(wallet0);

    uniswapV3Factory = uniswapv3Contracts.factory;
    uniswapPositionManager = uniswapv3Contracts.positionManager;
    swapRouter = uniswapv3Contracts.router;
  });

  describe("Running the pilot functions", async () => {
    it("Runs Unipilot Functions", async function () {
      console.log("WETH9", WETH9.address);
      console.log("UNISWAP FACTORY", uniswapV3Factory.address);
      let [wallet0, wallet1, wallet3] = await hre.ethers.getSigners();
      let wallets = [wallet0, wallet1, wallet3];

      shouldBehaveLikeUnipilotRouterFunctions(wallets, unipilotRouter);
    });
  });
});
