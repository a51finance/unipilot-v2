// import { parseUnits } from "@ethersproject/units";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Contract } from "ethers";
// import { MaxUint256 } from "@ethersproject/constants";
// import { UnipilotFactory } from "../../typechain";
// const { expect } = require("chai");

// export async function shouldBehaveLikeUnipilotRouterFunctions(
//   wallets: SignerWithAddress[],
//   UnipilotFactory: UnipilotFactory,
//   UnipilotVaultContract: Contract,
//   UnipilotRouter: Contract,
//   PILOT: Contract,
//   USDT: Contract,
// ): Promise<void> {
//   const owner = wallets[0];
//   let UnipilotVault: String;
//   describe("Testing Unipilot Router Skeleton", async () => {
//     it("Deposit: it should be fail  reason: Zero address !!", async () => {
//       let _vault: String = "0x0000000000000000000000000000000000000000";
//       await expect(
//         UnipilotRouter.connect(owner).deposit(
//           _vault,
//           owner.address,
//           parseUnits("10", "18"),
//           parseUnits("10", "18"),
//         ),
//       ).to.be.revertedWith("NA");
//     });

//     it("Deposit: it should pass", async () => {
//       await PILOT.connect(owner).approve(UnipilotRouter.address, MaxUint256);
//       await USDT.connect(owner).approve(UnipilotRouter.address, MaxUint256);

//       let result = await UnipilotRouter.connect(owner).callStatic.deposit(
//         UnipilotVaultContract.address,
//         owner.address,
//         parseUnits("10", "18"),
//         parseUnits("10", "18"),
//       );

//       console.log("Lp Share", result.toString());

//       result = await UnipilotRouter.connect(owner).deposit(
//         UnipilotVaultContract.address,
//         owner.address,
//         parseUnits("10", "18"),
//         parseUnits("10", "18"),
//       );
//       const pilotBalance = await PILOT.balanceOf(UnipilotVaultContract.address);
//       const usdtBalance = await USDT.balanceOf(UnipilotVaultContract.address);
//       console.log("PILOT BALANCE", pilotBalance);
//       // await expect(pilotBalance).to.be.equal(0);
//     });

//     //  it("should give balance of pilot and usdt", async () => {
//     //   const pilotBalance = await PILOT.balanceOf(vault.address);
//     //   const usdtBalance = await USDT.balanceOf(vault.address);

//     //   console.log("PIlot balance", pilotBalance);
//     //   console.log("Usdt balance", usdtBalance);
//     // });

//     it("Readjust For Passive Vault: Should pass", async () => {
//       let result = await UnipilotRouter.connect(owner).readjustLiquidity(
//         UnipilotVaultContract.address,
//       );
//       console.log("Readjust TX hash", result.hash);
//       let result1 = await UnipilotFactory.getVaults(
//         PILOT.address,
//         USDT.address,
//         3000,
//       );
//       console.log("VAULT RESULT 1", result1);
//     });

//     it("Reverts the vault to active state", async () => {
//       expect(
//         await UnipilotFactory.connect(owner).whitelistVaults([
//           UnipilotVaultContract.address,
//         ]),
//       );
//       let result = await UnipilotFactory.getVaults(
//         PILOT.address,
//         USDT.address,
//         3000,
//       );
//       console.log("VAULT RESULT2", result);
//     });

//     it("Deposit: it should pass in Active", async () => {
//       await PILOT.connect(owner).approve(UnipilotRouter.address, MaxUint256);
//       await USDT.connect(owner).approve(UnipilotRouter.address, MaxUint256);

//       let result = await UnipilotRouter.connect(owner).callStatic.deposit(
//         UnipilotVaultContract.address,
//         owner.address,
//         parseUnits("10", "18"),
//         parseUnits("10", "6"),
//       );

//       console.log("Lp Share", result.toString());

//       result = await UnipilotRouter.connect(owner).deposit(
//         UnipilotVaultContract.address,
//         owner.address,
//         parseUnits("10", "18"),
//         parseUnits("10", "18"),
//       );
//       expect(result).to.be.ok;
//     });

//     it("Readjust For Passive Vault: Should pass in Active", async () => {
//       // const vaultStatic = await UnipilotFactory.connect(owner).createVault(
//       //   PILOT.address,
//       //   USDT.address,
//       //   3000,
//       //   "42951287100",
//       //   "unipilot PILOT-USDT",
//       //   "PILOT-USDT",
//       // );

//       let result = await UnipilotRouter.connect(owner).readjustLiquidity(
//         UnipilotVaultContract.address,
//       );
//       console.log("Readjust TX hash", result.hash);
//     });

//     it("should give balance of pilot and usdt", async () => {
//       const pilotBalance = await PILOT.balanceOf(UnipilotVaultContract.address);
//       const usdtBalance = await USDT.balanceOf(UnipilotVaultContract.address);

//       console.log("Pilot balance", pilotBalance);
//       console.log("Usdt balance", usdtBalance);
//     });
//     // it("Withdraw: Should be pass", async () => {
//     //   let result = await UnipilotRouter.connect(owner).withdraw(
//     //     UnipilotVaultContract.address,
//     //     "20",
//     //     owner.address,
//     //   );
//     //   console.log("Withdraw Hash: ", result.hash);
//     // });
//   });
// }
