import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
const { expect } = require("chai");

export async function shouldBehaveLikeUnipilotRouterFunctions(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  UnipilotRouter: Contract,
  // UnipilotVault: Contract,
  PILOT: Contract,
  USDT: Contract,
): Promise<void> {
  const owner = wallets[0];
  const alice = wallets[1];
  let UnipilotVault: String;

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
    const vaultStatic = await UnipilotFactory.connect(
      owner,
    ).callStatic.createVault(
      PILOT.address,
      USDT.address,
      3000,
      42951287100,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );
    console.log("Create Vault", vaultStatic._pool.toString());
    UnipilotVault = await UnipilotFactory.connect(owner).createVault(
      PILOT.address,
      USDT.address,
      3000,
      42951287100,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );
    // console.log("vault deployed address", UnipilotVault);
    // await expect(vault).to.be.ok;

    // console.log(
    //   "Token o Alice Balance : ",
    //   await PILOT.balanceOf(owner.address),
    // );

    await PILOT.connect(owner).approve(UnipilotRouter.address, MaxUint256);
    await USDT.connect(owner).approve(UnipilotRouter.address, MaxUint256);

    console.log("Approve done");

    // console.log(
    //   "Allowance pilot",
    //   await PILOT.allowance(owner.address, UnipilotRouter.address),
    // );

    // let staticCall = await UnipilotRouter.connect(owner).callStatic.deposit(
    //   UnipilotVault.address,
    //   alice.address,
    //   parseUnits("1000", "18"),
    //   parseUnits("1", "6"),
    // );

    let result = await UnipilotRouter.connect(owner).callStatic.deposit(
      vaultStatic._vault,
      owner.address,
      parseUnits("1000", "18"),
      parseUnits("1", "6"),
    );

    console.log("Lp Share", result.toString());

    await UnipilotRouter.connect(owner).deposit(
      vaultStatic._vault,
      owner.address,
      parseUnits("1000", "18"),
      parseUnits("1", "6"),
    );

    expect(result).to.be.ok;
  });
}
