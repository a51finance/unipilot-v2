import bn from "bignumber.js";
import {
  BigNumber,
  BigNumberish,
  constants,
  Contract,
  ContractTransaction,
  utils,
  Wallet,
} from "ethers";

export const MaxUint128 = BigNumber.from(2).pow(128).sub(1);

export const getMinTick = (tickSpacing: number) =>
  Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
  Math.floor(887272 / tickSpacing) * tickSpacing;

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

export const getMaxLiquidityPerTick = (tickSpacing: number) =>
  BigNumber.from(2)
    .pow(128)
    .sub(1)
    .div((getMaxTick(tickSpacing) - getMinTick(tickSpacing)) / tickSpacing + 1);

export const MIN_SQRT_RATIO = BigNumber.from("4295128739");
export const MAX_SQRT_RATIO = BigNumber.from(
  "1461446703485210103287273052203988822378723970342",
);

export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

export function encodePriceSqrt(
  reserve1: BigNumberish,
  reserve0: BigNumberish,
): BigNumber {
  return BigNumber.from(
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString(),
  );
}

export function getPositionKey(
  address: string,
  lowerTick: number,
  upperTick: number,
): string {
  return utils.keccak256(
    utils.solidityPack(
      ["address", "int24", "int24"],
      [address, lowerTick, upperTick],
    ),
  );
}
