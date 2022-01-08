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

  it("Deposit: it should pass", async () => {
    const vaultStatic = await UnipilotFactory.connect(
      owner,
    ).callStatic.createVault(
      PILOT.address,
      USDT.address,
      3000,
      "42951287100",
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );
    console.log("Create Vault", vaultStatic._vault.toString());
    UnipilotVault = await UnipilotFactory.connect(owner).createVault(
      PILOT.address,
      USDT.address,
      3000,
      "42951287100",
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );
    await PILOT.connect(owner).approve(UnipilotRouter.address, MaxUint256);
    await USDT.connect(owner).approve(UnipilotRouter.address, MaxUint256);

    console.log("Approve done");

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

    result = await UnipilotRouter.connect(owner).callStatic.deposit(
      vaultStatic._vault,
      owner.address,
      parseUnits("5000", "18"),
      parseUnits("2", "6"),
    );
    console.log("Lp Share 2", result.toString());
    expect(result).to.be.ok;
  });

  it("Readjust: Should be successful", async () => {
    const vaultStatic = await UnipilotFactory.connect(
      owner,
    ).callStatic.createVault(
      PILOT.address,
      USDT.address,
      3000,
      "42951287100",
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    let result = await UnipilotRouter.connect(owner).readjustLiquidity(
      vaultStatic._vault,
    );
    console.log("TX hash", result.hash);
  });
}
