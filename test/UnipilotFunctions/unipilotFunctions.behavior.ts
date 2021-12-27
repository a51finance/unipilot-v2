import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { shouleBehaveLikePilotFactory } from "../UnipilotFactoryFunctions/UnipilotFactory.behavior";
import { shouldBehaveLikeUnipilotRouterFunctions } from "../UnipilotRouterFunctions/unipilotRouterFunctions.behavior";

export async function shouldBehaveLikeUnipilotFunctions(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  UniswapV3Factory: Contract,
  UnipilotRouter: Contract,
  WETH9: Contract,
  PILOT: Contract,
  pool: string,
): Promise<void> {
  describe("Testing the UnipilotFactory !!", async () => {
    shouleBehaveLikePilotFactory(
      wallets,
      UnipilotFactory,
      UniswapV3Factory,
      WETH9,
      PILOT,
      pool,
    );
  });

  describe("Testing the UnipilotRouter !!", async () => {
    shouldBehaveLikeUnipilotRouterFunctions(wallets, UnipilotRouter);
  });
}
