import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";

export async function shouleBehaveLikePilotFactory(
  wallets: SignerWithAddress[],
  unipilotFactory: Contract,
): Promise<void> {
  const owner = wallets[0];

  //   it("Should fail set price threshold, unauthorized", async () => {
  //     await expect(unipilotFactory.connect(wallets[3]).setPricethreshold(parseUnits("1", "4"))).to.be.revertedWith(
  //       "Strategy:: Not governance",
  //     );
  //   });
}
