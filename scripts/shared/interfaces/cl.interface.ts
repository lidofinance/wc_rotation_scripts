export interface Validator {
  index: string;
  balance: string;
  status: string;
  validator: {
    pubkey: string;
    withdrawal_credentials: string;
    effective_balance: string;
    slashed: boolean;
    activation_eligibility_epoch: string;
    activation_epoch: string;
    exit_epoch: string;
    withdrawable_epoch: string;
  };
}

export interface Deposit {
  proof: string[];
  data: DepositData;
}

export interface DepositData {
  pubkey: string;
  withdrawal_credentials: string;
  amount: string;
  signature: string;
}

export interface ExecutionPayload {
  parent_hash: string;
  fee_recipient: string;
  state_root: string;
  receipts_root: string;
  logs_bloom: string;
  prev_randao: string;
  block_number: string;
  gas_limit: string;
  gas_used: string;
  timestamp: string;
  extra_data: string;
  base_fee_per_gas: string;
  block_hash: string;
  transactions: string[];
}

export interface Eth1Data {
  deposit_root: string;
  deposit_count: string;
  block_hash: string;
}

export interface BeaconBlockBody {
  randao_reveal: string;
  eth1_data: Eth1Data;
  graffiti: string;
  proposer_slashings: any[];
  attester_slashings: any[];
  attestations: any[];
  deposits: Deposit[];
  voluntary_exits: any[];
  sync_aggregate?: any[];
  execution_payload?: ExecutionPayload;
  bls_to_execution_changes?: SignedBLSToExecutionChange[];
}

export interface SignedBLSToExecutionChange {
  message: BLSToExecutionChange;
  signature: string;
}

export interface BLSToExecutionChange {
  validator_index: string;
  from_bls_pubkey: string;
  to_execution_address: string;
}

export interface BeaconBlock {
  slot: string;
  proposer_index: string;
  parent_root: string;
  state_root: string;
  body: BeaconBlockBody;
}

export interface SignedBeaconBlock {
  message: BeaconBlock;
  signature: string;
}

export interface GetBlockV2Response {
  version: string;
  execution_optimistic: boolean;
  finalized: boolean;
  data: SignedBeaconBlock;
}

export interface GetDepositContractResponse {
  data: {
    chain_id: string;
    address: string;
  };
}
