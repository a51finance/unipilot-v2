/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface IUnipilotVaultInterface extends ethers.utils.Interface {
  functions: {
    "deposit(address,address,uint256,uint256)": FunctionFragment;
    "getVaultInfo()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "deposit",
    values: [string, string, BigNumberish, BigNumberish],
  ): string;
  encodeFunctionData(
    functionFragment: "getVaultInfo",
    values?: undefined,
  ): string;

  decodeFunctionResult(functionFragment: "deposit", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getVaultInfo",
    data: BytesLike,
  ): Result;

  events: {
    "Deposit(address,uint256,uint256,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Deposit"): EventFragment;
}

export type DepositEvent = TypedEvent<
  [string, BigNumber, BigNumber, BigNumber] & {
    depositor: string;
    amount0: BigNumber;
    amount1: BigNumber;
    lpShares: BigNumber;
  }
>;

export class IUnipilotVault extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>,
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: IUnipilotVaultInterface;

  functions: {
    deposit(
      depositor: string,
      recipient: string,
      amount0: BigNumberish,
      amount1: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<ContractTransaction>;

    getVaultInfo(
      overrides?: CallOverrides,
    ): Promise<[string, string, BigNumber]>;
  };

  deposit(
    depositor: string,
    recipient: string,
    amount0: BigNumberish,
    amount1: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction>;

  getVaultInfo(overrides?: CallOverrides): Promise<[string, string, BigNumber]>;

  callStatic: {
    deposit(
      depositor: string,
      recipient: string,
      amount0: BigNumberish,
      amount1: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getVaultInfo(
      overrides?: CallOverrides,
    ): Promise<[string, string, BigNumber]>;
  };

  filters: {
    "Deposit(address,uint256,uint256,uint256)"(
      depositor?: null,
      amount0?: null,
      amount1?: null,
      lpShares?: null,
    ): TypedEventFilter<
      [string, BigNumber, BigNumber, BigNumber],
      {
        depositor: string;
        amount0: BigNumber;
        amount1: BigNumber;
        lpShares: BigNumber;
      }
    >;

    Deposit(
      depositor?: null,
      amount0?: null,
      amount1?: null,
      lpShares?: null,
    ): TypedEventFilter<
      [string, BigNumber, BigNumber, BigNumber],
      {
        depositor: string;
        amount0: BigNumber;
        amount1: BigNumber;
        lpShares: BigNumber;
      }
    >;
  };

  estimateGas: {
    deposit(
      depositor: string,
      recipient: string,
      amount0: BigNumberish,
      amount1: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<BigNumber>;

    getVaultInfo(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    deposit(
      depositor: string,
      recipient: string,
      amount0: BigNumberish,
      amount1: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<PopulatedTransaction>;

    getVaultInfo(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}