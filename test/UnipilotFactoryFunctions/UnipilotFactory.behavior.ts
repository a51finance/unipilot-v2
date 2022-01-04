import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";

export async function shouleBehaveLikePilotFactory(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  UniswapV3Factory: Contract,
  WETH9: Contract,
  PILOT: Contract,
): Promise<void> {
  const governance = wallets[0];
  const alice = wallets[1];
  it("Governance: it should pass reason: as the governance is wallet[0]", async () => {
    // console.log("governance address", governanceAddress, governance.address);
    expect(await UnipilotFactory.connect(wallets[0]).governance()).to.equal(
      governance.address,
    );
  });

  it("Governance: it should pass  reason: as it is not governance address", async () => {
    await expect(
      await UnipilotFactory.connect(wallets[3]).governance(),
    ).to.not.equal(alice.address);
  });

  it("Governance: it should pass reason: wallet[0] is calling setgovernance to alice", async () => {
    await expect(
      await UnipilotFactory.connect(governance).setGovernance(alice.address),
    ).to.ok;
    const newgovernance = await UnipilotFactory.connect(
      governance,
    ).governance();
  });

  it("Governance: it should pass reason: alice is the new governance", async () => {
    await expect(
      await UnipilotFactory.connect(governance).governance(),
    ).to.equal(alice.address);
  });

  it("Governance: it should pass reason: governance is not the new governance", async () => {
    await expect(
      await UnipilotFactory.connect(governance).governance(),
    ).to.not.equal(governance.address);
  });

  // it("Governance: revert message: NO reason: failed as owner will try to setOwner", async () => {
  //   await expect(
  //     await UnipilotFactory.connect(governance).setGovernance(
  //       governance.address,
  //     ),
  //   ).to.be.revertedWith("NG");
  // });

  it("Vault deployment(cool shit): Will deploy new vault of a uniswap pool", async () => {
    const vault = await UnipilotFactory.connect(governance).createVault(
      WETH9.address,
      PILOT.address,
      3000,
      42951287100,
      "unipilot PILOT-WETH",
      "PILOT-WETH",
    );
    await expect(vault).to.be.ok;
  });

  it("Get vault after it is deployed", async () => {
    const vault = await UnipilotFactory.connect(governance).getVaults(
      WETH9.address,
      PILOT.address,
      3000,
    );
    console.log("vault deployed address", vault);
  });
}
