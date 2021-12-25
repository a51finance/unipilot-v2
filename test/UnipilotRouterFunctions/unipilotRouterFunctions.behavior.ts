import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
const { expect } = require("chai");

export async function shouldBehaveLikeUnipilotRouterFunctions(
  wallets: SignerWithAddress[],
  // UniswapFactory: Contract,
  UnipilotRouter: Contract,
): Promise<void> {
  const owner = wallets[0];
  const alice = wallets[1];

  it("Deposit: it should be fail  reason: Zero address !!", async () => {
    let vault: String = "0x0000000000000000000000000000000000000000";
    await expect(
      UnipilotRouter.connect(alice).deposit(
        vault,
        alice.address,
        parseUnits("1000", "18"),
        parseUnits("1", "18"),
      ),
    ).to.be.revertedWith("NA");
  });
}
