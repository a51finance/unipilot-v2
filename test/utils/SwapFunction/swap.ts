import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "@ethersproject/units";
import { MaxUint256 } from "@ethersproject/constants";

export async function generateFeeThroughSwap(
  swapRouter: Contract,
  wallet: SignerWithAddress,
  tokenIn: Contract,
  tokenOut: Contract,
) {
  await tokenIn.approve(swapRouter.address, MaxUint256);
  await tokenOut.approve(swapRouter.address, MaxUint256);

  const decimalsIn: BigNumber = await tokenIn.decimals();
  const decimalsOut: BigNumber = await tokenOut.decimals();

  const sellOrderParams = {
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    fee: 3000,
    recipient: wallet.address,
    deadline: Math.round(Date.now() / 1000) + 86400,
    amountIn: parseUnits("500", decimalsIn.toString()),
    amountOutMinimum: parseUnits("0", decimalsOut.toString()),
    sqrtPriceLimitX96: "0",
  };

  const buyOrderParams = {
    tokenIn: tokenOut.address,
    tokenOut: tokenIn.address,
    fee: 3000,
    recipient: wallet.address,
    deadline: Math.round(Date.now() / 1000) + 86400,
    amountIn: parseUnits("500", decimalsOut.toString()),
    amountOutMinimum: parseUnits("0", decimalsIn.toString()),
    sqrtPriceLimitX96: "0",
  };

  for (let i = 0; i < 2; i++) {
    await swapRouter.exactInputSingle(sellOrderParams);
    await swapRouter.exactInputSingle(buyOrderParams);
  }
}
