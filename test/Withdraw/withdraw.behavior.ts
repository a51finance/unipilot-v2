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
import { UniswapV3Pool, UnipilotVault } from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeWithdraw(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotVault;
  let token0: Contract;
  let token1: Contract;
}
