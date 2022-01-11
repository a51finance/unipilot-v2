import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract } from "ethers";
import { Pilot, UnipilotVault } from "../../typechain";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";

export async function shouldBehaveLikeVaultFunctions(
  wallets: SignerWithAddress[],
  vault: UnipilotVault,
  uniswapFactory: Contract,
  baseThreshold: number,
  indexFundAddress: string,
  PILOT: Contract,
  USDT: Contract,
): Promise<void> {
  // it("should fail depoit with IL", async () => {
  //   await expect(
  //     vault.deposit(
  //       wallets[0].address,
  //       wallets[0].address,
  //       0,
  //       parseUnits("2", "18"),
  //     ),
  //   ).to.be.revertedWith("IL");
  // });

  describe("Testing Unipilot Vault", async () => {
    it("checking name of vault LP Token", async () => {
      const vaultName = (await vault.name()).toString();
      console.log("Vault name", vaultName);
      expect(vaultName).to.be.equal("unipilot PILOT-USDT");
    });

    it("checking name of vault LP Token", async () => {
      const vaultSymbol = (await vault.symbol()).toString();
      console.log("Vault symbol", vaultSymbol);
      expect(vaultSymbol).to.be.equal("PILOT-USDT");
    });

    it("checking name of vault LP Token", async () => {
      const totalSupply = (await vault.totalSupply()).toString();
      console.log("Vault total Supply", totalSupply);
      expect(totalSupply).to.be.equal("0");
    });

    it("should successfully deposit liquidity", async () => {
      let lpShares = (
        await vault.callStatic.deposit(
          wallets[0].address,
          wallets[0].address,
          parseUnits("10", "18"),
          parseUnits("10", "6"),
        )
      ).toString();

      await vault.deposit(
        wallets[0].address,
        wallets[0].address,
        parseUnits("10", "18"),
        parseUnits("10", "6"),
      );

      expect(await lpShares).to.be.ok;
    });

    it("should give balance of pilot and usdt", async () => {
      const pilotBalance = await PILOT.balanceOf(vault.address);
      const usdtBalance = await USDT.balanceOf(vault.address);

      console.log("Pilot balance", pilotBalance);
      console.log("Usdt balance", usdtBalance);
    });

    it("should successfully readjust vault", async () => {
      expect(await vault.readjustLiquidity()).to.be.ok;
    });
  });
}

// async function getShares(
//   amount0Desired: any,
//   amount1Desired: any,
//   vault: Contract,
// ): Promise<any> {
//   let totalSupply = await vault.totalSupply();
//   let totalAmount0 = await vault.totalAmount0();
//   let totalAmount1 = await vault.totalAmount1();
//   let lpShares: any;
//   if (totalSupply == 0) {
//     lpShares =
//       amount0Desired > amount1Desired ? amount0Desired : amount1Desired;
//     console.log("INSIDE SIMULATED GET SHARES", lpShares);
//   } else if (totalAmount0 == 0) {
//     lpShares = (amount1Desired * totalSupply) / totalAmount1;
//     console.log("INSIDE SIMULATED GET SHARES", lpShares);
//   } else if (totalAmount1 == 1) {
//     lpShares = (amount0Desired * totalSupply) / totalAmount0;
//     console.log("INSIDE SIMULATED GET SHARES", lpShares);
//   } else {
//     let cross: any =
//       amount0Desired * totalAmount1
//         ? amount0Desired * totalAmount1 < amount1Desired * totalAmount0
//         : amount1Desired * totalAmount0;

//     lpShares = (cross * totalSupply) / totalAmount0 / totalAmount1;
//     console.log("INSIDE SIMULATED GET SHARES", lpShares);
//   }
//   return lpShares;
// }
