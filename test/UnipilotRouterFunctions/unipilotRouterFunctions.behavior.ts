import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
const { expect } = require("chai");

export async function shouldBehaveLikeUnipilotRouterFunctions(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  UnipilotVaultContract: Contract,
  UnipilotRouter: Contract,
  PILOT: Contract,
  USDT: Contract,
): Promise<void> {
  const owner = wallets[0];
  const alice = wallets[1];
  let UnipilotVault: String;
  describe("Testing Unipilot Router Skeleton", async () => {
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
     
      await PILOT.connect(owner).approve(UnipilotRouter.address, MaxUint256);
      await USDT.connect(owner).approve(UnipilotRouter.address, MaxUint256);

      let result = await UnipilotRouter.connect(owner).callStatic.deposit(
        UnipilotVaultContract.address,
        owner.address,
        parseUnits("1000", "18"),
        parseUnits("1", "6"),
      );

      console.log("Lp Share", result.toString());

      result = await UnipilotRouter.connect(owner).deposit(
        UnipilotVaultContract.address,
        owner.address,
        parseUnits("1000", "18"),
        parseUnits("1", "6"),
      );
        expect(result).to.be.ok;
    });

    // it("Readjust: Should be pass", async () => {
    //   // const vaultStatic = await UnipilotFactory.connect(owner).createVault(
    //   //   PILOT.address,
    //   //   USDT.address,
    //   //   3000,
    //   //   "42951287100",
    //   //   "unipilot PILOT-USDT",
    //   //   "PILOT-USDT",
    //   // );

    //   let result = await UnipilotRouter.connect(owner).readjustLiquidity(
    //     UnipilotVaultContract.address,
    //   );
    //   console.log("TX hash", result.hash);
    // });

    // it("Withdraw: Should be pass", async () => {
    //   let result = await UnipilotRouter.connect(owner).withdraw(
    //     UnipilotVaultContract.address,
    //     "1",
    //     owner.address,
    //   );
    //   console.log("Withdraw Hash: ", result.hash);
    // });
  });
}
