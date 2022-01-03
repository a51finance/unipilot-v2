import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
const { expect } = require("chai");

export async function shouldBehaveLikeUnipilotRouterFunctions(
  wallets: SignerWithAddress[],
  UniswapV3Factory: Contract,
  UnipilotRouter: Contract,
  UnipilotVault: Contract,
  PILOT: Contract,
  USDT: Contract,
): Promise<void> {
  const owner = wallets[0];
  const alice = wallets[1];

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
    // console.log(
    //   "Token o Alice Balance : ",
    //   await PILOT.balanceOf(owner.address),
    // );

    await PILOT.connect(owner).approve(UnipilotRouter.address, MaxUint256);
    await USDT.connect(owner).approve(UnipilotRouter.address, MaxUint256);

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

    let result = await UnipilotRouter.connect(owner).deposit(
      UnipilotVault.address,
      alice.address,
      parseUnits("1000", "18"),
      parseUnits("1", "6"),
    );

    expect(result).to.be.ok;
  });
}
