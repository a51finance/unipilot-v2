import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
// import { shouleBehaveLikePilotFactory } from "../UnipilotRouterFunctions/";

export async function shouldBehaveLikeUnipilotRouterFunctions(
  wallets: SignerWithAddress[],
  // UniswapFactory: Contract,
  UnipilotRouter: Contract,
): Promise<void> {
  describe("Testing the UnipilotRouter !!", async () => {
    console.log("UnipilotRouter Address: ", UnipilotRouter.address);
    
  });
}
