import { Argument, Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import { fetchBLSToExecutionChanges, readValidatorsIndexesFile } from './shared';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();
const program = new Command();

const playAlarm = async () => {
  const execPromise = promisify(exec);

  while (true) {
    await execPromise('afplay /System/Library/Sounds/Ping.aiff');
  }
};

program
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-e, --execution-address <string>', 'Execution address').default(''))
  .addArgument(new Argument('<file-path>', 'File to filter validators'))
  .action(async (filePath, { consensusLayer, executionAddress }) => {
    /**
     * Read the validator indexes file content
     * Indexes must be separated by `\n`
     */
    console.log('Reading validator indexes from file...');
    const validatorIndexes = readValidatorsIndexesFile(filePath);
    console.log('Validator indexes are read:', validatorIndexes.length);

    do {
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
      const unknownAddress = messagesFromFile.filter(({ message }) => message.to_execution_address != executionAddress);

      console.table({
        'Total messages in pool': messagesInPool.length,
        'Messages from validators from the file': messagesFromFile.length,
        'Unknown execution address for known validators': unknownAddress.length,
      });

      if (unknownAddress.length) {
        console.warn('Found unknown withdrawal credentials');
        console.table(
          unknownAddress.map(({ message: { validator_index, to_execution_address } }) => ({
            validator_index,
            to_execution_address,
          })),
        );

        await playAlarm();
      }

      await new Promise((resolve) => setTimeout(resolve, 300_000));
      console.log();
      console.log('----------------------------------------');
      console.log();
    } while (true);
  })
  .parse(process.argv);
