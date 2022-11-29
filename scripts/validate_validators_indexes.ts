import { Argument, Command, Option } from 'commander';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

interface Validator {
  index: string;
  validator: {
    pubkey: string;
    withdrawal_credentials: string;
  };
}

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

const readValidatorsIndexesFile = (filePath: string) => {
  const fileContent = readFileSync(filePath, 'utf8').toString().trimEnd();

  const validatorIndexes = fileContent.split('\n').map((line, lineIndex) => {
    const data = line.split(',');

    if (data.length !== 2) {
      throw new Error('Wrong file format');
    }

    const messageIndex = Number(data[0]);
    const validatorIndex = Number(data[1]);

    if (messageIndex !== lineIndex) {
      throw new Error('Message index does not match the line number');
    }

    if (Number.isNaN(validatorIndex)) {
      throw new Error('Validator index is not a number');
    }

    return validatorIndex;
  });

  return validatorIndexes;
};

const validateValidatorIndexes = (validatorIndexes: number[], filteredValidatorsFromCL: Validator[]) => {
  const validatorIndexesSet = new Set(validatorIndexes);

  if (validatorIndexesSet.size !== validatorIndexes.length) {
    throw new Error('The number of unique validator indexes does not match the total number of indexes');
  }

  if (validatorIndexesSet.size !== filteredValidatorsFromCL.length) {
    throw new Error('The number of validator indexes does not correspond to the number of recently fetched indexes');
  }

  filteredValidatorsFromCL.forEach((data) => {
    if (!validatorIndexesSet.has(Number(data.index))) {
      throw new Error('Index not found in recently fetched indexes');
    }
  });
};

const program = new Command();

program
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
  .addArgument(new Argument('<file-path>', 'File to validate'))
  .action(async (filePath, { consensusLayer, withdrawalCredentials }) => {
    const { slotNumber, blockNumber } = await getFinalizedSlotInfo(consensusLayer);

    console.table({
      'Finalized slot': slotNumber,
      'Finalized block': blockNumber,
    });

    /**
     * Read the validator indexes file content
     * The data must be in the csv format: `message_index`,`validator_index`
     */
    console.log('Reading validator indexes from file...');

    const validatorIndexes = readValidatorsIndexesFile(filePath);

    console.log('Validator indexes are read:', validatorIndexes.length);

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
     * Compare validators indexes from file
     * with validators on Consensus Layer
     */
    console.log('Validating validator indexes...');

    validateValidatorIndexes(validatorIndexes, filteredValidatorsFromCL);

    console.log('The data is valid');
  })
  .parse(process.argv);
