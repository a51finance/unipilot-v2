import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";

export async function shouldBehaveLikeTokenApproval(
  token: Contract,
  to: string,
): Promise<void> {
  it("Should Approve token to the vault contract", async () => {
    expect(await token.approve(to, MaxUint256));
  });
}
