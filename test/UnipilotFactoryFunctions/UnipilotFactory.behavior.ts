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

  it("Governance: it should pass  reason: as it is not governance address", async () => {
    await expect(
      await unipilotFactory.connect(wallets[3]).owner(),
    ).to.not.equal(alice.address);
  });

  it("Governanace: it should pass reason: wallet[0] is calling setOwner to alice", async () => {
    await expect(await unipilotFactory.connect(owner).setOwner(alice.address))
      .to.ok;
    const newOwner = await unipilotFactory.connect(owner).owner();
  });

  it("Governanace: it should pass reason: alice is the new owner", async () => {
    await expect(await unipilotFactory.connect(owner).owner()).to.equal(
      alice.address,
    );
  });

  it("Governanace: it should pass reason: owner is not the new owner", async () => {
    await expect(await unipilotFactory.connect(owner).owner()).to.not.equal(
      owner.address,
    );
  });

  it("Governace: revert message: NO reason: failed as owner will try to setOwner", async () => {
    await expect(
      await unipilotFactory.connect(owner).setOwner(owner.address),
    ).to.be.revertedWith("NO");
  });
}
