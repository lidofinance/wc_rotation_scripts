import { Argument, Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import { fetchBLSToExecutionChanges, readValidatorsIndexesFile } from './shared';

dotenv.config();
const program = new Command();

program
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addArgument(new Argument('<file-path>', 'File to filter validators'))
  .action(async (filePath, { consensusLayer }) => {
    /**
     * Read the validator indexes file content
     * Indexes must be separated by `\n`
     */
    console.log('Reading validator indexes from file...');
    const validatorIndexes = readValidatorsIndexesFile(filePath);
    console.log('Validator indexes are read:', validatorIndexes.length);

    /**
     * Collect messages to rotate withdrawals credentials from pool
     */
    console.log('Fetching rotation message from Consensus Layer...');
    const messagesInPool = await fetchBLSToExecutionChanges(consensusLayer);
    console.log('Messages fetched');

    /**
     * Collect statistics
     */
    const filteredSet = new Set(validatorIndexes);
    const messagesFromFile = messagesInPool.filter(({ message }) => filteredSet.has(Number(message.validator_index)));

    console.table({
      'Total messages in pool': messagesInPool.length,
      'Messages from validators from the file': messagesFromFile.length,
    });
  })
  .parse(process.argv);
