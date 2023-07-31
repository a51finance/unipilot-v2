const hre = require("hardhat");

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
  PancakeV3Pool,
  NonfungiblePositionManager,
  UnipilotPassiveVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeLive(): Promise<void> {
  let owner: any;
  beforeEach("Fork Begin", async () => {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.FORK}`,
            blockNumber: 14409239,
          },
        },
      ],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xB3764761E297D6f121e79C32A65829Cd1dDb4D32"],
    });

    owner = await ethers.getSigner(
      "0xB3764761E297D6f121e79C32A65829Cd1dDb4D32",
    );
  });

  it("Balance of Signer", async () => {
    const walletBalancePrior = await ethers.provider.getBalance(owner.address);
    console.log("Balance Of signer is: ", walletBalancePrior);
  });
}
