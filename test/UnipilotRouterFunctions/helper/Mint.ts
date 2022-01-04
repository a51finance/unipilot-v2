import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";

export async function Mint(
  token: Contract,
  recipient: SignerWithAddress,
  amount: BigNumber,
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

  await token.connect(recipient)._mint(recipient.address, amount);
  console.log(
    "Balance of alice token0",
    await token.balanceOf(recipient.address),
  );
}

export async function ApprovalForContract(
  contract: Contract,
  sender: SignerWithAddress,
  recipient: String,
  amount: BigNumber,
) {
  let result = await contract.connect(sender).approve(recipient, amount);
  console.log(
    "Allowance: ",
    await contract.allowance(sender.address, recipient),
  );

  // console.log("Approved:", result.hash);
}
