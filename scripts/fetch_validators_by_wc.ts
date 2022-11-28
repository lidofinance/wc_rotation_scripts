import { Argument, Command, Option } from 'commander';
import { Contract, providers, utils } from 'ethers';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import ProgressBar from 'progress';
import { appendFileSync } from 'fs';

dotenv.config();

interface Validator {
  index: string;
  validator: {
    pubkey: string;
    withdrawal_credentials: string;
  };
}

const fetchFilteredPubkeysFromDepositContract = async (
  depositContract: Contract,
  withdrawalCredentials: string,
  toBlockNumber: number,
  fetchStep: number,
) => {
  const eventFetchBar = new ProgressBar('Fetching events [:bar] :current/:total | Found :deposits', {
    total: toBlockNumber + 1,
  });

  const totalSteps = Math.floor(toBlockNumber / fetchStep);

  const filteredPubkeys = new Set<string>();

  for (let i = 0; i <= totalSteps; i++) {
    const fromBlock = i * fetchStep;
    const toBlock = Math.min(fromBlock + fetchStep - 1, toBlockNumber);

    // Including fromBlock and toBlock
    const result = await depositContract.queryFilter('DepositEvent', fromBlock, toBlock);

    result.forEach((event) => {
      const depositPubkey = event.args?.pubkey;
      const depositWithdrawalCredentials = event.args?.withdrawal_credentials;

      if (!utils.isHexString(depositPubkey)) {
        throw new Error('Pubkey is not a hex string');
      }

      if (!utils.isHexString(depositWithdrawalCredentials)) {
        throw new Error('Withdrawal credentials is not a hex string');
      }

      if (depositWithdrawalCredentials === withdrawalCredentials) {
        filteredPubkeys.add(depositPubkey);
      }
    });

    eventFetchBar.tick(toBlock - fromBlock + 1, { deposits: filteredPubkeys.size });
  }

  return filteredPubkeys;
};

const fetchFilteredValidatorsFromConsensusLayer = async (
  consensusLayerURL: string,
  stateId: string | number,
  withdrawalCredentials: string,
) => {
  const validators = await fetchValidators(consensusLayerURL, stateId);
  const filteredValidators = validators.filter((data: any) => {
    return data.validator.withdrawal_credentials === withdrawalCredentials;
  });

  return filteredValidators;
};

const fetchValidators = async (consensusLayerURL: string, stateId: string | number) => {
  const url = new URL(`/eth/v1/beacon/states/${stateId}/validators`, consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = await response.json();

  return data as Validator[];
};

const getDepositContractAddress = async (consensusLayerURL: string) => {
  const url = new URL('/eth/v1/config/deposit_contract', consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = await response.json();

  return data.address as string;
};

const getProvider = (executionLayerURL: string) => {
  return new providers.JsonRpcProvider(executionLayerURL);
};

const getDepositContract = async (address: string, provider: providers.Provider) => {
  const abi = [
    'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
  ];

  return new Contract(address, abi, provider);
};

const getFinalizedSlotInfo = async (consensusLayerURL: string) => {
  const url = new URL('/eth/v2/beacon/blocks/finalized', consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = await response.json();

  const slotNumber = Number(data.message.slot);
  const blockNumber = Number(data.message.body.execution_payload.block_number);

  return {
    slotNumber,
    blockNumber,
  };
};

const validateValidatorsData = (filteredValidatorsFromCL: Validator[], filteredPubkeysFromEL: Set<string>) => {
  if (filteredValidatorsFromCL.length === 0) {
    throw new Error('No validators found on Consensus Layer');
  }

  if (filteredPubkeysFromEL.size === 0) {
    throw new Error('No validators found on Execution Layer');
  }

  if (filteredValidatorsFromCL.length !== filteredPubkeysFromEL.size) {
    throw new Error('The number of validators on the Consensus Layer and Execution Layer is different');
  }

  filteredValidatorsFromCL.forEach((data) => {
    if (!filteredPubkeysFromEL.has(data.validator.pubkey)) {
      throw new Error(`Validator with pubkey ${data.validator.pubkey} not found on Execution Layer`);
    }
  });
};

const saveValidatorsIndexesToFile = (filePath: string, filteredValidatorsFromCL: Validator[]) => {
  const validatorIndexes = filteredValidatorsFromCL.map((data) => Number(data.index)).sort((a, b) => a - b);
  validatorIndexes.forEach((validatorIndex, index) => {
    appendFileSync(filePath, `${index},${validatorIndex}\n`);
  });
};

const program = new Command();

program
  .addOption(
    new Option('-e, --execution-layer <string>', 'Execution layer node URL')
      .env('EXECUTION_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(
    new Option(
      '-w, --withdrawal-credentials <string>',
      'Withdrawal credentials to filter deposits',
    ).makeOptionMandatory(),
  )
  .addOption(
    new Option('-s, --fetch-step <number>', 'Step of fetching events from the deposit contract')
      .default(100_000)
      .argParser(parseInt),
  )
  .addArgument(new Argument('<file-path>', 'File to save result'))
  .action(async (filePath, { consensusLayer, executionLayer, withdrawalCredentials, fetchStep }) => {
    const provider = getProvider(executionLayer);

    const depositContractAddress = await getDepositContractAddress(consensusLayer);
    const depositContract = await getDepositContract(depositContractAddress, provider);

    const { slotNumber, blockNumber } = await getFinalizedSlotInfo(consensusLayer);

    console.table({
      'Finalized slot': slotNumber,
      'Finalized block': blockNumber,
      'Deposit contract address': depositContract.address,
    });

    /**
     * Collect all validators that have certain `withdrawal_credentials`
     * on the `slotNumber` state on Consensus Layer
     */
    console.log('Fetching validators from Consensus Layer...');

    const filteredValidatorsFromCL = await fetchFilteredValidatorsFromConsensusLayer(
      consensusLayer,
      slotNumber,
      withdrawalCredentials,
    );

    console.log('Validators fetched. Validators with the withdrawal_credentials:', filteredValidatorsFromCL.length);
    console.log('-----');

    /**
     * Collect all unique validators public keys that have certain `withdrawal_credentials`
     * from `DepositEvent` events on the deposit contract
     */
    console.log('Fetching deposits from Execution Layer...');

    const filteredPubkeysFromEL = await fetchFilteredPubkeysFromDepositContract(
      depositContract,
      withdrawalCredentials,
      blockNumber,
      fetchStep,
    );

    console.log('Deposit events fetched. Unique pubkeys with the withdrawal_credentials:', filteredPubkeysFromEL.size);
    console.log('-----');

    /**
     * Compare the data fetched from Consensus Layer and Execution Layer
     */
    console.log('Comparing data from Consensus Layer and Execution Layer...');

    validateValidatorsData(filteredValidatorsFromCL, filteredPubkeysFromEL);

    console.log('The data from Consensus Layer and Execution Layer are consistent');
    console.log('-----');

    /**
     * Save data to a file
     */
    console.log('Saving data to file...');

    saveValidatorsIndexesToFile(filePath, filteredValidatorsFromCL);

    console.log('The data is saved to:', filePath);
  })
  .parse(process.argv);
