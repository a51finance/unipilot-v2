import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";

export async function shouleBehaveLikePilotFactory(
  wallets: SignerWithAddress[],
  unipilotFactory: Contract,
): Promise<void> {
  const governance = wallets[0];
  const alice = wallets[1];
  it("Governance: it should pass reason: as the governance is wallet[0]", async () => {
    // console.log("governance address", governanceAddress, governance.address);

    await expect(
      await unipilotFactory.connect(wallets[3]).governance(),
    ).to.equal(governance.address);
  });
  it("Governance: it should pass  reason: as it is not governance address", async () => {
    await expect(
      await unipilotFactory.connect(wallets[3]).governance(),
    ).to.not.equal(alice.address);
  });
  it("Governance: it should pass reason: wallet[0] is calling setgovernance to alice", async () => {
    await expect(
      await unipilotFactory.connect(governance).setgovernance(alice.address),
    ).to.ok;
    const newgovernance = await unipilotFactory
      .connect(governance)
      .governance();
  });
  it("Governance: it should pass reason: alice is the new governance", async () => {
    await expect(
      await unipilotFactory.connect(governance).governance(),
    ).to.equal(alice.address);
  });
  it("Governance: it should pass reason: governance is not the new governance", async () => {
    await expect(
      await unipilotFactory.connect(governance).governance(),
    ).to.not.equal(governance.address);
  });
  // it("Governance: revert message: NO reason: failed as owner will try to setOwner", async () => {
  //   await expect(
  //     await unipilotFactory.connect(owner).setOwner(owner.address),
  //   ).to.be.revertedWith("NO");
  // });
}
