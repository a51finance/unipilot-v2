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
  const alice = wallets[1];
  it("Governance: it should pass reason: as the owner is wallet[0]", async () => {
    // console.log("governance address", governanceAddress, owner.address);
    await expect(await unipilotFactory.connect(wallets[3]).owner()).to.equal(
      owner.address,
    );
  });

  it("Governance: it should fail  reason: as it is not governance address", async () => {
    await expect(await unipilotFactory.connect(wallets[3]).owner()).to.equal(
      alice.address,
    );
  });
}
