import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
export async function shouldBehaveLikeVaultState(
  wallet: SignerWithAddress,
): Promise<void> {
  it("should return token0 name", async => {
    expect(console.log("Yiss"));
  });
}
