import { BigNumber, Contract, Wallet } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "@ethersproject/units";
import { MaxUint256 } from "@ethersproject/constants";

export async function generateFeeThroughSwap(
  swapRouter: Contract,
  wallet: Wallet,
  tokenIn: Contract,
  tokenOut: Contract,
  amountIn: string,
) {
  const decimalsIn: BigNumber = await tokenIn.decimals();
  const decimalsOut: BigNumber = await tokenOut.decimals();

  const sellOrderParams = {
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    fee: 3000,
    recipient: wallet.address,
    deadline: Math.round(Date.now() / 1000) + 86400,
    amountIn: parseUnits(amountIn, "18"),
    amountOutMinimum: parseUnits("0", "18"),
    sqrtPriceLimitX96: "0",
  };

  const buyOrderParams = {
    tokenIn: tokenOut.address,
    tokenOut: tokenIn.address,
    fee: 3000,
    recipient: wallet.address,
    deadline: Math.round(Date.now() / 1000) + 86400,
    amountIn: parseUnits(amountIn, decimalsOut.toString()),
    amountOutMinimum: parseUnits("0", decimalsIn.toString()),
    sqrtPriceLimitX96: "0",
  };

  // for (let i = 0; i < 2; i++) {
  console.log("params -> ", sellOrderParams);
  await swapRouter.connect(wallet).exactInputSingle(sellOrderParams, {
    gasLimit: "3000000",
  });
  //   await swapRouter.exactInputSingle(buyOrderParams);
  // }
}
