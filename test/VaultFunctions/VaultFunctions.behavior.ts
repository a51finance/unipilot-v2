import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";

export async function shouldBehaveLikeVaultFunctions(
  wallets: SignerWithAddress[],
  vault: Contract,
  uniswapFactory: Contract,
): Promise<void> {
  it("should successfully deposit liquidity", async () => {
    console.log("Vault name", (await vault.name()).toString());
    console.log("Vault symbol", (await vault.symbol()).toString());
    console.log("Vault supply", (await vault.totalSupply()).toString());
    expect(
      await vault.callStatic.deposit(
        wallets[0].address,
        wallets[1].address,
        parseUnits("2", "18"),
        parseUnits("2", "18"),
      ),
    );
  });
}
