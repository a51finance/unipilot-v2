import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

export async function shouldBehaveLikeVaultFunctions(
  wallets: SignerWithAddress[],
  vault: Contract,
): Promise<void> {}
