import { expect, use } from "chai";
import { BigNumber, Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";

import { solidity } from "ethereum-waffle";

import { waffle, ethers } from "hardhat";

import { parseUnits } from "@ethersproject/units";
import { getMaxTick, getMinTick, unipilotVaultFixture } from "./utils/fixtures";
import { encodePriceSqrt } from "./utils/encodePriceSqrt";
import { IUniswapV3Pool, NonfungiblePositionManager } from "../typechain";
import { shouldBehaveLikeDeposit } from "./DepositActive/depositActive.behavior";
import { shouldBehaveLikeDepositPassive } from "./DepositPassive/depositPassive.behavior";

use(solidity);

describe("Invokes deposit active", async () => {
  await shouldBehaveLikeDeposit();
});

describe("Invokes deposit passive", async () => {
  await shouldBehaveLikeDepositPassive();
});
