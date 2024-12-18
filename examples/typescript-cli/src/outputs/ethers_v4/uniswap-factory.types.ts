import type { EthersContractContextV4 } from '@abi-toolkit/converter-typescript'
import type { ContractTransaction } from 'ethersv4'
import type { BigNumber, BigNumberish } from 'ethersv4/utils'

import type {
  EventFilter,
  ContractTransactionOverrides,
  ContractCallOverrides,
} from './common.types'

export type ContractContext = EthersContractContextV4<
  Contract,
  EventsContext,
  Events
>
export type Events = 'NewExchange'
export interface EventsContext {
  NewExchange(token: string, exchange: string): EventFilter
}
export type MethodNames =
  | 'initializeFactory'
  | 'createExchange'
  | 'getExchange'
  | 'getToken'
  | 'getTokenWithId'
  | 'exchangeTemplate'
  | 'tokenCount'
export type MethodNameMap = {
  [key in MethodNames]: string
}
export interface NewExchangeEventEmittedResponse {
  token: string
  exchange: string
}
export interface Contract {
  /**
   * Payable: false
   * Constant: false
   * StateMutability: undefined
   * Type: function
   * @param template Type: address, Indexed: false
   */
  initializeFactory(
    template: string,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>
  /**
   * Payable: false
   * Constant: false
   * StateMutability: undefined
   * Type: function
   * @param token Type: address, Indexed: false
   */
  createExchange(
    token: string,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: undefined
   * Type: function
   * @param token Type: address, Indexed: false
   */
  getExchange(token: string, overrides?: ContractCallOverrides): Promise<string>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: undefined
   * Type: function
   * @param exchange Type: address, Indexed: false
   */
  getToken(exchange: string, overrides?: ContractCallOverrides): Promise<string>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: undefined
   * Type: function
   * @param token_id Type: uint256, Indexed: false
   */
  getTokenWithId(
    token_id: BigNumberish,
    overrides?: ContractCallOverrides,
  ): Promise<string>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: undefined
   * Type: function
   */
  exchangeTemplate(overrides?: ContractCallOverrides): Promise<string>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: undefined
   * Type: function
   */
  tokenCount(overrides?: ContractCallOverrides): Promise<BigNumber>
}
