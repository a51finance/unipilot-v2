import { ethers } from "hardhat";

export const mineNBlocks = async (n: number): Promise<number> => {
  let tempPromises: any = [];
  for (let i = 0; i < n; i++) {
    tempPromises.push(ethers.provider.send("evm_mine", []));
  }
  await Promise.all(tempPromises);
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  return currentBlockNumber;
  // console.log("currentBlockNumber: ", currentBlockNumber);
};
