import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { deployPilot, deployToken } from "../TokenDeployer/TokenStubs";
import { ApprovalForContract, Mint } from "./helper/Mint";
const { expect } = require("chai");

export async function shouldBehaveLikeUnipilotRouterFunctions(
  wallets: SignerWithAddress[],
  // UniswapFactory: Contract,
  UnipilotRouter: Contract,
  vault: String,
): Promise<void> {
  const owner = wallets[0];
  const alice = wallets[1];

  it("Deposit: it should be fail  reason: Zero address !!", async () => {
    let _vault: String = "0x0000000000000000000000000000000000000000";
    await expect(
      UnipilotRouter.connect(owner).deposit(
        _vault,
        owner.address,
        parseUnits("1000", "18"),
        parseUnits("1", "18"),
      ),
    ).to.be.revertedWith("NA");
  });

  it("Deposit: it should be pass", async () => {
    let pilot: Contract = await deployPilot(owner);
    let usdt: Contract = await deployToken(owner, "Tether Stable", "USDT", 6);

    Mint(pilot, usdt, alice, 1000, 1);
    ApprovalForContract(pilot, UnipilotRouter.address, 1000);
    ApprovalForContract(usdt, UnipilotRouter.address, 1);

    await expect(
      UnipilotRouter.connect(alice).deposit(
        vault,
        alice.address,
        parseUnits("1000", "18"),
        parseUnits("1", "6"),
      ),
    ).to.be.ok;
  });
}
