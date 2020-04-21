import { Sequelize } from "sequelize";

import { StateChannelJSON } from "./state";
import { AppInstanceJson, AppInstanceProposal } from "./app";
import { Address, Bytes32 } from "./basic";
import {
  ConditionalTransactionCommitmentJSON,
  MinimalTransaction,
  SetStateCommitmentJSON,
} from "./commitments";
import { enumify } from "./utils";
import { IWatcherStoreService } from "./watcher";

export const ConnextNodeStorePrefix = "INDRA_NODE_CF_CORE";
export const ConnextClientStorePrefix = "INDRA_CLIENT_CF_CORE";

export const StoreTypes = enumify({
  AsyncStorage: "AsyncStorage",
  File: "File",
  LocalStorage: "LocalStorage",
  Postgres: "Postgres",
  Memory: "Memory",
});
export type StoreTypes = typeof StoreTypes[keyof typeof StoreTypes];

export type StorePair = {
  path: string;
  value: any;
};

export type InitCallback = (data: AsyncStorageData) => void;

export interface AsyncStorageData {
  [key: string]: any;
}

export interface IAsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface WrappedStorage {
  getItem<T = any>(key: string): Promise<T | undefined>;
  setItem<T = any>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  getKeys(): Promise<string[]>;
  getEntries(): Promise<[string, any][]>;
  clear(): Promise<void>;
  restore(): Promise<void>;
  // generates a key for related subject strings
  getKey(...args: string[]): string;
}

export interface FileStorageOptions {
  fileExt?: string;
  fileDir?: string;
}

export interface StoreFactoryOptions extends FileStorageOptions {
  storage?: IAsyncStorage | WrappedStorage;
  prefix?: string;
  separator?: string;
  asyncStorageKey?: string;
  postgresConnectionUri?: string;
  sequelize?: Sequelize;
  backupService?: IBackupServiceAPI;
}

export interface IBackupServiceAPI {
  restore(): Promise<StorePair[]>;
  backup(pair: StorePair): Promise<void>;
}

export const STORE_SCHEMA_VERSION = 1;

// IWatcherStoreService contains all event/challenge storage methods
// in addition to all the getters for the setters defined below
export interface IStoreService extends IWatcherStoreService {
  ///// Schema version
  updateSchemaVersion(version?: number): Promise<void>;

  ///// State channels
  createStateChannel(stateChannel: StateChannelJSON): Promise<void>;

  ///// App instances
  createAppInstance(
    multisigAddress: Address,
    appInstance: AppInstanceJson,
    freeBalanceAppInstance: AppInstanceJson,
  ): Promise<void>;
  updateAppInstance(multisigAddress: Address, appInstance: AppInstanceJson): Promise<void>;
  removeAppInstance(
    multisigAddress: Address,
    appIdentityHash: Bytes32,
    freeBalanceAppInstance: AppInstanceJson,
  ): Promise<void>;

  ///// App proposals
  createAppProposal(
    multisigAddress: Address,
    appProposal: AppInstanceProposal,
    numProposedApps: number,
  ): Promise<void>;
  removeAppProposal(multisigAddress: Address, appIdentityHash: Bytes32): Promise<void>;
  // proposals dont need to be updated

  ///// Free balance
  updateFreeBalance(
    multisigAddress: Address,
    freeBalanceAppInstance: AppInstanceJson,
  ): Promise<void>;

  ///// Setup commitment
  createSetupCommitment(multisigAddress: Address, commitment: MinimalTransaction): Promise<void>;
  // no update, only ever created once

  ///// SetState commitment
  createSetStateCommitment(
    appIdentityHash: Bytes32,
    commitment: SetStateCommitmentJSON,
  ): Promise<void>;
  updateSetStateCommitment(
    appIdentityHash: Bytes32,
    commitment: SetStateCommitmentJSON,
  ): Promise<void>;
  removeSetStateCommitment(
    appIdentityHash: Bytes32,
    commitment: SetStateCommitmentJSON,
  ): Promise<void>;
  // apps may have multiple set state commitments
  // to allow for participants to call `progressState` or 
  // `setAndProgressState` on state n with set state commitment
  // at state n -1. These commitments should be removed at the
  // end of the take action protocol


  ///// Conditional tx commitment
  createConditionalTransactionCommitment(
    appIdentityHash: Bytes32,
    commitment: ConditionalTransactionCommitmentJSON,
  ): Promise<void>;
  updateConditionalTransactionCommitment(
    appIdentityHash: Bytes32,
    commitment: ConditionalTransactionCommitmentJSON,
  ): Promise<void>;
  // no removal for disputes

  ///// Withdrawal commitment
  createWithdrawalCommitment(
    multisigAddress: Address,
    commitment: MinimalTransaction,
  ): Promise<void>;
  updateWithdrawalCommitment(
    multisigAddress: Address,
    commitment: MinimalTransaction,
  ): Promise<void>;

  ///// Resetting methods
  clear(): Promise<void>;
  restore(): Promise<void>;
}

export interface IClientStore extends IStoreService {
  getUserWithdrawals(): Promise<WithdrawalMonitorObject[]>;
  createUserWithdrawal(withdrawalObject: WithdrawalMonitorObject): Promise<void>;
  updateUserWithdrawal(withdrawalObject: WithdrawalMonitorObject): Promise<void>;
  removeUserWithdrawal(toRemove: WithdrawalMonitorObject): Promise<void>;
}

// Used to monitor node submitted withdrawals on behalf of user
export type WithdrawalMonitorObject = {
  retry: number;
  tx: MinimalTransaction;
};

export interface ChannelsMap {
  [multisigAddress: string]: any;
}
