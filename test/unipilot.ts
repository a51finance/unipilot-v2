import { expect, use } from "chai";
import { BigNumber, utils, Contract, ContractFactory } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
import {
  deployStrategy,
  deployUnipilotFactory,
  deployUnipilotRouter,
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
import { getMaxTick, getMinTick } from "./utils/fixtures";

use(solidity);

describe("Initializing the testing suite", async () => {
  let uniswapV3Factory: Contract;
  let uniswapPositionManager: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotRouter: Contract;
  let uniStrategy: Contract;
  let WETH9: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDC: Contract;
  let USDT: Contract;
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
    USDT = await deployToken(wallet0, "Tether Stable", "USDT", 18);
    let uniswapv3Contracts = await deployUniswapContracts(wallet0, WETH9);
    console.log(
      "uniswapv3COntracts factory",
      uniswapv3Contracts.factory.address,
    );
    uniswapV3Factory = uniswapv3Contracts.factory;
    uniswapPositionManager = uniswapv3Contracts.positionManager;
    uniStrategy = await deployStrategy(wallet0);
    unipilotRouter = await deployUnipilotRouter(wallet0);
    unipilotFactory = await deployUnipilotFactory(
      uniswapV3Factory.address,
      wallet0,
      uniStrategy.address,
    );

    uniswapPositionManager = uniswapv3Contracts.positionManager;
    swapRouter = uniswapv3Contracts.router;
    PILOT = await deployPilot(wallet0);

    await DAI.approve(uniswapPositionManager.address, MaxUint256);
    await DAI._mint(wallet0.address, parseUnits("5000", "18"));
    await USDT.approve(uniswapPositionManager.address, MaxUint256);
    await USDT._mint(wallet0.address, parseUnits("5000", "18"));
  });

  describe("Running the pilot functions", async () => {
    it("Runs Unipilot Functions", async function () {
      let [wallet0, wallet1, wallet2, wallet3] = await hre.ethers.getSigners();
      let wallets: SignerWithAddress[] = [wallet0, wallet1, wallet2, wallet3];
      console.log("POSITION MANAGER", uniswapPositionManager.address);
      await shouldBehaveLikeUnipilotFunctions(
        wallets,
        unipilotFactory,
        unipilotRouter,
        WETH9,
        DAI,
        USDT,
        uniswapPositionManager,
        uniswapV3Factory,
        swapRouter,
      );
    });
  });
});
