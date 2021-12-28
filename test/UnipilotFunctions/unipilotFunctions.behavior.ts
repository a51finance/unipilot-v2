import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";
import { shouleBehaveLikePilotFactory } from "../UnipilotFactoryFunctions/UnipilotFactory.behavior";
import { shouldBehaveLikeUnipilotRouterFunctions } from "../UnipilotRouterFunctions/unipilotRouterFunctions.behavior";
import { shouldBehaveLikeVaultFunctions } from "../VaultFunctions/VaultFunctions.behavior";

export async function shouldBehaveLikeUnipilotFunctions(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  UnipilotVault: Contract,
  UniswapV3Factory: Contract,
  WETH9: Contract,
  PILOT: Contract,
  pool: string,
): Promise<void> {
  // describe("Testing the UnipilotFactory !!", async () => {
  //   shouleBehaveLikePilotFactory(wallets, UnipilotFactory);
  // });

  describe("Testing the UnipilotFactory !!", async () => {
    shouleBehaveLikePilotFactory(
      wallets,
      UnipilotFactory,
      UniswapV3Factory,
      WETH9,
      PILOT,
      pool,
    );
  });

  // describe("Testing the UnipilotRouter !!", async () => {
  //   shouldBehaveLikeUnipilotRouterFunctions(wallets, UnipilotRouter);
  // });

  describe("Testing Unipilot Vault", async () => {
    await shouldBehaveLikeVaultFunctions(
      wallets,
      UnipilotVault,
      UniswapV3Factory,
    );
  });
}
