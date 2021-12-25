import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { shouleBehaveLikePilotFactory } from "../UnipilotFactoryFunctions/UnipilotFactory.behavior";

export async function shouldBehaveLikeUnipilotFunctions(
  wallets: SignerWithAddress[],
  UniswapFactory: Contract,
  UnipilotFactory: Contract,
): Promise<void> {
  describe("Testing the UnipilotFactory !!", async () => {
    //   await shouldBehaveLikeCreatePool(wallets, Ulm, mintProxy, Unipilot, tokens);
    shouleBehaveLikePilotFactory(wallets, UnipilotFactory);
  });
}
