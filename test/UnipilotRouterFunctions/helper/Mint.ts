import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

export async function Mint(
  token0: Contract,
  token1: Contract,
  recipient: SignerWithAddress,
  amount1: Number,
  amount2: Number,
) {
  // console.log(
  //   `Contract Address: ${contract.address} + recipient:${recipient} + amount ${amount}`,
  // );
  // await WETH9.connect(recipient).transfer(recipient.address, amount1);
  // await token0.approve(recipient.address, amount1);
  // // let result = await WETH9.transferFrom(WETH9.address, recipient.address, amount1);
  // console.log(await token0.totalSupply());

  // console.log(await WETH9.balanceOf(recipient.address));

  // console.log(WETH9);

  await token0.connect(recipient).mint(recipient.address, amount1);
  console.log(await token0.balanceOf(recipient.address));

  await token1.connect(recipient).mint(recipient.address, amount2);
  console.log(await token1.balanceOf(recipient.address));
}

export async function ApprovalForContract(
  contract: Contract,
  recipient: String,
  amount: Number,
) {
  await contract.approve(recipient, amount);
}
