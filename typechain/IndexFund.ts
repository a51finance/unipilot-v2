/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";

export interface IndexFundInterface extends utils.Interface {
  functions: {
    "addLockedFundsAddresses(address[])": FunctionFragment;
    "circulatingSupply()": FunctionFragment;
    "lockedFundAddresses(uint256)": FunctionFragment;
    "migrateFunds(address,address[])": FunctionFragment;
    "removeLockedFundsAddress(uint256)": FunctionFragment;
    "withdraw(address[],uint256)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "addLockedFundsAddresses",
    values: [string[]],
  ): string;
  encodeFunctionData(
    functionFragment: "circulatingSupply",
    values?: undefined,
  ): string;
  encodeFunctionData(
    functionFragment: "lockedFundAddresses",
    values: [BigNumberish],
  ): string;
  encodeFunctionData(
    functionFragment: "migrateFunds",
    values: [string, string[]],
  ): string;
  encodeFunctionData(
    functionFragment: "removeLockedFundsAddress",
    values: [BigNumberish],
  ): string;
  encodeFunctionData(
    functionFragment: "withdraw",
    values: [string[], BigNumberish],
  ): string;

  decodeFunctionResult(
    functionFragment: "addLockedFundsAddresses",
    data: BytesLike,
  ): Result;
  decodeFunctionResult(
    functionFragment: "circulatingSupply",
    data: BytesLike,
  ): Result;
  decodeFunctionResult(
    functionFragment: "lockedFundAddresses",
    data: BytesLike,
  ): Result;
  decodeFunctionResult(
    functionFragment: "migrateFunds",
    data: BytesLike,
  ): Result;
  decodeFunctionResult(
    functionFragment: "removeLockedFundsAddress",
    data: BytesLike,
  ): Result;
  decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;

  events: {
    "Withdrawn(address,uint256,uint256,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Withdrawn"): EventFragment;
}

export type WithdrawnEvent = TypedEvent<
  [string, BigNumber, BigNumber, BigNumber],
  {
    tokenAddress: string;
    pilotAmount: BigNumber;
    tokenAmount: BigNumber;
    circulatingPilotSupply: BigNumber;
  }
>;

export type WithdrawnEventFilter = TypedEventFilter<WithdrawnEvent>;

export interface IndexFund extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IndexFundInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>,
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>,
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    addLockedFundsAddresses(
      _accounts: string[],
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<ContractTransaction>;

    circulatingSupply(
      overrides?: CallOverrides,
    ): Promise<[BigNumber] & { supply: BigNumber }>;

    lockedFundAddresses(
      arg0: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<[string]>;

    migrateFunds(
      _newVersion: string,
      tokens: string[],
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<ContractTransaction>;

    removeLockedFundsAddress(
      _index: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<ContractTransaction>;

    withdraw(
      _tokenAddresses: string[],
      _pilotAmount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<ContractTransaction>;
  };

  addLockedFundsAddresses(
    _accounts: string[],
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction>;

  circulatingSupply(overrides?: CallOverrides): Promise<BigNumber>;

  lockedFundAddresses(
    arg0: BigNumberish,
    overrides?: CallOverrides,
  ): Promise<string>;

  migrateFunds(
    _newVersion: string,
    tokens: string[],
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction>;

  removeLockedFundsAddress(
    _index: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction>;

  withdraw(
    _tokenAddresses: string[],
    _pilotAmount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction>;

  callStatic: {
    addLockedFundsAddresses(
      _accounts: string[],
      overrides?: CallOverrides,
    ): Promise<void>;

    circulatingSupply(overrides?: CallOverrides): Promise<BigNumber>;

    lockedFundAddresses(
      arg0: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<string>;

    migrateFunds(
      _newVersion: string,
      tokens: string[],
      overrides?: CallOverrides,
    ): Promise<void>;

    removeLockedFundsAddress(
      _index: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<void>;

    withdraw(
      _tokenAddresses: string[],
      _pilotAmount: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<void>;
  };

  filters: {
    "Withdrawn(address,uint256,uint256,uint256)"(
      tokenAddress?: string | null,
      pilotAmount?: BigNumberish | null,
      tokenAmount?: BigNumberish | null,
      circulatingPilotSupply?: null,
    ): WithdrawnEventFilter;
    Withdrawn(
      tokenAddress?: string | null,
      pilotAmount?: BigNumberish | null,
      tokenAmount?: BigNumberish | null,
      circulatingPilotSupply?: null,
    ): WithdrawnEventFilter;
  };

  estimateGas: {
    addLockedFundsAddresses(
      _accounts: string[],
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<BigNumber>;

    circulatingSupply(overrides?: CallOverrides): Promise<BigNumber>;

    lockedFundAddresses(
      arg0: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    migrateFunds(
      _newVersion: string,
      tokens: string[],
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<BigNumber>;

    removeLockedFundsAddress(
      _index: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<BigNumber>;

    withdraw(
      _tokenAddresses: string[],
      _pilotAmount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addLockedFundsAddresses(
      _accounts: string[],
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<PopulatedTransaction>;

    circulatingSupply(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    lockedFundAddresses(
      arg0: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    migrateFunds(
      _newVersion: string,
      tokens: string[],
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<PopulatedTransaction>;

    removeLockedFundsAddress(
      _index: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<PopulatedTransaction>;

    withdraw(
      _tokenAddresses: string[],
      _pilotAmount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> },
    ): Promise<PopulatedTransaction>;
  };
}