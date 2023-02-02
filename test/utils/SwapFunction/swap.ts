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
  // await tokenIn.approve(swapRouter.address, MaxUint256);
  // await tokenOut.approve(swapRouter.address, MaxUint256);

  const decimalsIn: BigNumber = await tokenIn.decimals();
  const decimalsOut: BigNumber = await tokenOut.decimals();

  const sellOrderParams = {
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    recipient: wallet.address,
    deadline: Math.round(Date.now() / 1000) + 86400,
    amountIn: parseUnits(amountIn, "18"),
    amountOutMinimum: parseUnits("0", "18"),
    limitSqrtPrice: "0",
  };
  //   struct ExactInputSingleParams {
  //     address tokenIn;
  //     address tokenOut;
  //     address recipient;
  //     uint256 deadline;
  //     uint256 amountIn;
  //     uint256 amountOutMinimum;
  //     uint160 limitSqrtPrice;
  // }

  const buyOrderParams = {
    tokenIn: tokenOut.address,
    tokenOut: tokenIn.address,
    recipient: wallet.address,
    deadline: Math.round(Date.now() / 1000) + 86400,
    amountIn: parseUnits(amountIn, decimalsOut.toString()),
    amountOutMinimum: parseUnits("0", decimalsIn.toString()),
    sqrtPriceLimitX96: "0",
  };

  // for (let i = 0; i < 2; i++) {

  await swapRouter.connect(wallet).exactInputSingle(sellOrderParams, {
    gasLimit: "3000000",
    value: 0,
  });
  //   await swapRouter.exactInputSingle(buyOrderParams);
  // }
}
