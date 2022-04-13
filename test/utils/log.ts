import { BigNumber } from "ethers";

export function logMessage(msg: string, ...params: any) {
  console.log(msg, "-->", ...params);
}

export function formatTokenBalance(param: BigNumber) {
  return BigNumber.from(param).toString();
}
