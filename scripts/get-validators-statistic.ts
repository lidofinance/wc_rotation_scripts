import { Argument, Command, Option } from 'commander';
import { Contract, providers, utils } from 'ethers';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fetchSlotData, fetchValidators, filterValidators, readValidatorsIndexesFile, Validator } from './shared';

dotenv.config();
const program = new Command();

program
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-s, --slot-id <string>', 'Slot id to fetch data').default('finalized').makeOptionMandatory())
  .addArgument(new Argument('<file-path>', 'File to filter validators'))
  .action(async (filePath, { consensusLayer, slotId }) => {
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
    console.log('Validators fetched');

    /**
     * Collect statistics by validators
     */

    const type0 = validatorsFromCL.filter(({ validator }) => validator.withdrawal_credentials.startsWith('0x00'));
    const type1 = validatorsFromCL.filter(({ validator }) => validator.withdrawal_credentials.startsWith('0x01'));

    const filteredSet = new Set(validatorIndexes);
    const filteredType0 = type0.filter(({ index }) => filteredSet.has(Number(index)));
    const filteredType1 = type1.filter(({ index }) => filteredSet.has(Number(index)));

    console.table({
      'Total validators': validatorsFromCL.length,
      'Total validators with 0x00 wc type': type0.length,
      'Total validators with 0x01 wc type': type1.length,
    });

    console.table({
      'Total filtered validators': filteredSet.size,
      'Total filtered validators with 0x00 wc type': filteredType0.length,
      'Total filtered validators with 0x01 wc type': filteredType1.length,
    });
  })
  .parse(process.argv);
