import type { EthersContractContextV5 } from '@abi-toolkit/converter-typescript'
import type { ContractTransaction, BigNumber, BigNumberish } from 'ethersv5'

import type {
  EventFilter,
  ContractTransactionOverrides,
  ContractCallOverrides,
} from './common.types'

export type ContractContext = EthersContractContextV5<
  Contract,
  MethodNames,
  EventsContext,
  Events
>
export type Events = 'NewComet' | 'NewStakingComet' | 'RemoveComet'
export interface EventsContext {
  NewComet(
    cometId: string,
    token: string,
    balance: BigNumberish,
    unit: BigNumberish,
    solarSystemID: BigNumberish,
  ): EventFilter
  NewStakingComet(
    cometId: string,
    token: string,
    balance: BigNumberish,
    capacity: BigNumberish,
    rate: BigNumberish,
    solarSystemID: BigNumberish,
  ): EventFilter
  RemoveComet(
    cometId: string,
    token: string,
    solarSystemID: BigNumberish,
  ): EventFilter
}
export type MethodNames =
  | 'updateSolarSystemStore'
  | 'addComet'
  | 'removeComet'
  | 'cometPosition'
  | 'getComet'
  | 'getStakingComet'
  | 'cometsFrom'
  | 'countCometIn'
export type MethodNameMap = {
  [key in MethodNames]: string
}
export interface NewCometEventEmittedResponse {
  cometId: string
  token: string
  balance: BigNumberish
  unit: BigNumberish
  solarSystemID: BigNumberish
}
export interface NewStakingCometEventEmittedResponse {
  cometId: string
  token: string
  balance: BigNumberish
  capacity: BigNumberish
  rate: BigNumberish
  solarSystemID: BigNumberish
}
export interface RemoveCometEventEmittedResponse {
  cometId: string
  token: string
  solarSystemID: BigNumberish
}
export interface CartesianResponse {
  x: BigNumber
  0: BigNumber
  y: BigNumber
  1: BigNumber
}
export interface GetCometCenterResponse {
  x: BigNumber
  0: BigNumber
  y: BigNumber
  1: BigNumber
}
export interface GetCometLastResponse {
  distance: number
  0: number
  angle: BigNumber
  1: BigNumber
}
export interface GetCometOrbitResponse {
  center: GetCometCenterResponse
  0: GetCometCenterResponse
  last: GetCometLastResponse
  1: GetCometLastResponse
  rotationSpeed: number
  2: number
  lastUpdate: BigNumber
  3: BigNumber
}
export interface CometResponse {
  id: string
  0: string
  orbit: GetCometOrbitResponse
  1: GetCometOrbitResponse
  token: string
  2: string
  unit: BigNumber
  3: BigNumber
  balance: BigNumber
  4: BigNumber
  solarSystemID: BigNumber
  5: BigNumber
}
export interface GetStakingCometCenterResponse {
  x: BigNumber
  0: BigNumber
  y: BigNumber
  1: BigNumber
}
export interface GetStakingCometLastResponse {
  distance: number
  0: number
  angle: BigNumber
  1: BigNumber
}
export interface GetStakingCometOrbitResponse {
  center: GetStakingCometCenterResponse
  0: GetStakingCometCenterResponse
  last: GetStakingCometLastResponse
  1: GetStakingCometLastResponse
  rotationSpeed: number
  2: number
  lastUpdate: BigNumber
  3: BigNumber
}
export interface StakingCometResponse {
  id: string
  0: string
  orbit: GetStakingCometOrbitResponse
  1: GetStakingCometOrbitResponse
  token: string
  2: string
  balance: BigNumber
  3: BigNumber
  rate: BigNumber
  4: BigNumber
  capacity: BigNumber
  5: BigNumber
  roverCount: BigNumber
  6: BigNumber
  cumulatedRate: BigNumber
  7: BigNumber
  collectable: BigNumber
  8: BigNumber
  lastUpdate: BigNumber
  9: BigNumber
  solarSystemID: BigNumber
  10: BigNumber
}
export interface CometsFromCenterResponse {
  x: BigNumber
  0: BigNumber
  y: BigNumber
  1: BigNumber
}
export interface CometsFromLastResponse {
  distance: number
  0: number
  angle: BigNumber
  1: BigNumber
}
export interface CometsFromOrbitResponse {
  center: CometsFromCenterResponse
  0: CometsFromCenterResponse
  last: CometsFromLastResponse
  1: CometsFromLastResponse
  rotationSpeed: number
  2: number
  lastUpdate: BigNumber
  3: BigNumber
}
export interface CometsFromResponse {
  result0: CometResponse[]
  0: CometResponse[]
  result1: StakingCometResponse[]
  1: StakingCometResponse[]
  length: 2
}
export interface Contract {
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param newStore Type: address, Indexed: false
   */
  updateSolarSystemStore(
    newStore: string,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param cometId Type: address, Indexed: false
   * @param x Type: int256, Indexed: false
   * @param y Type: int256, Indexed: false
   * @param distance Type: uint32, Indexed: false
   * @param rotationSpeed Type: uint16, Indexed: false
   * @param solarSystemID Type: uint256, Indexed: false
   */
  addComet(
    cometId: string,
    x: BigNumberish,
    y: BigNumberish,
    distance: BigNumberish,
    rotationSpeed: BigNumberish,
    solarSystemID: BigNumberish,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param cometId Type: address, Indexed: false
   * @param solarSystemID Type: uint256, Indexed: false
   */
  removeComet(
    cometId: string,
    solarSystemID: BigNumberish,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param cometId Type: address, Indexed: false
   * @param time Type: uint256, Indexed: false
   * @param solarSystemID Type: uint256, Indexed: false
   */
  cometPosition(
    cometId: string,
    time: BigNumberish,
    solarSystemID: BigNumberish,
    overrides?: ContractCallOverrides,
  ): Promise<CartesianResponse>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param cometId Type: address, Indexed: false
   * @param solarSystemID Type: uint256, Indexed: false
   */
  getComet(
    cometId: string,
    solarSystemID: BigNumberish,
    overrides?: ContractCallOverrides,
  ): Promise<CometResponse>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param cometId Type: address, Indexed: false
   * @param solarSystemID Type: uint256, Indexed: false
   */
  getStakingComet(
    cometId: string,
    solarSystemID: BigNumberish,
    overrides?: ContractCallOverrides,
  ): Promise<StakingCometResponse>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param solarSystemID Type: uint256, Indexed: false
   */
  cometsFrom(
    solarSystemID: BigNumberish,
    overrides?: ContractCallOverrides,
  ): Promise<CometsFromResponse>
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param solarSystemID Type: uint256, Indexed: false
   */
  countCometIn(
    solarSystemID: BigNumberish,
    overrides?: ContractCallOverrides,
  ): Promise<BigNumber>
}
