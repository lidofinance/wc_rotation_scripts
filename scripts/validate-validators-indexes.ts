import { Argument, Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import { fetchValidators, filterValidators, ValidatorData, readValidatorsIndexesFile } from './shared';

dotenv.config();
const program = new Command();

const validateValidatorIndexes = (validatorIndexes: number[], filteredValidatorsFromCL: ValidatorData[]) => {
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
  .addOption(new Option('-s, --slot-id <string>', 'Slot id to fetch data').default('finalized').makeOptionMandatory())
  .addArgument(new Argument('<file-path>', 'File to validate'))
  .action(async (filePath, { consensusLayer, withdrawalCredentials, slotId }) => {
    /**
     * Read the validator indexes file content
     * Indexes must be separated by `\n`
     */
    console.log('Reading validator indexes from file...');
    const validatorIndexes = readValidatorsIndexesFile(filePath);
    console.log('Validator indexes are read:', validatorIndexes.length);

    /**
     * Collect all validators that have certain `withdrawal_credentials`
     * on the `slotId` state on Consensus Layer
     */
    console.log('Fetching validators from Consensus Layer...');
    const validatorsFromCL = await fetchValidators(consensusLayer, slotId);
    const filteredValidatorsFromCL = filterValidators(validatorsFromCL, withdrawalCredentials);
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
