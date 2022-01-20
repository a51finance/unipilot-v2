import { expect, use } from "chai";
import { BigNumber, Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";

import { solidity } from "ethereum-waffle";

import { waffle, ethers } from "hardhat";

import { parseUnits } from "@ethersproject/units";
import { getMaxTick, getMinTick, unipilotVaultFixture } from "./utils/fixtures";
import { encodePriceSqrt } from "./utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotVault,
} from "../typechain";
import { generateFeeThroughSwap } from "./utils/SwapFunction/swap";
import { shouldBehaveLikeDepositActive } from "./DepositActive/depositActive.behavior";

use(solidity);

describe("Invokes Deposit Active Tests", async () => {
  await shouldBehaveLikeDepositActive();
});
