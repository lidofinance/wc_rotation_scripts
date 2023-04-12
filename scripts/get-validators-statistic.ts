import { Argument, Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import { fetchValidators, readValidatorsIndexesFile } from './shared';
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
  .addOption(new Option('-s, --slot-id <string>', 'Slot id to fetch data').default('head').makeOptionMandatory())
  .addOption(new Option('-w, --allowed-wc <string>', 'Allowed withdrawal credentials, comma separated').default(''))
  .addArgument(new Argument('<file-path>', 'File to filter validators'))
  .action(async (filePath, { consensusLayer, slotId, allowedWc }) => {
    /**
     * Read the validator indexes file content
     * Indexes must be separated by `\n`
     */
    console.log('Reading validator indexes from file...');
    const validatorIndexes = readValidatorsIndexesFile(filePath);
    console.log('Validator indexes are read:', validatorIndexes.length);

    do {
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

      const allowedWcSet = new Set<string>(allowedWc.split(',').map((wc: string) => wc.trim()));

      const filteredSet = new Set(validatorIndexes);
      const filteredType0 = type0.filter(({ index }) => filteredSet.has(Number(index)));
      const filteredType1 = type1.filter(({ index }) => filteredSet.has(Number(index)));

      const unknownWc = validatorsFromCL.filter(
        ({ validator, index }) => !allowedWcSet.has(validator.withdrawal_credentials) && filteredSet.has(Number(index)),
      );

      console.table({
        'Total validators': validatorsFromCL.length,
        'Total validators with 0x00 wc type': type0.length,
        'Total validators with 0x01 wc type': type1.length,
      });

      console.log('Known withdrawal credentials', [...allowedWcSet]);

      console.table({
        'Total filtered validators': filteredSet.size,
        'Total filtered validators with 0x00 wc type': filteredType0.length,
        'Total filtered validators with 0x01 wc type': filteredType1.length,
        'Validators with unknown wc': unknownWc.length,
      });

      if (unknownWc.length) {
        console.warn('Found unknown withdrawal credentials');
        console.table(
          unknownWc.map(({ index, validator }) => ({
            index,
            withdrawal_credentials: validator.withdrawal_credentials,
          })),
        );

        await playAlarm();
      }

      if (slotId === 'head') {
        await new Promise((resolve) => setTimeout(resolve, 300_000));
        console.log();
        console.log('----------------------------------------');
        console.log();
      }
    } while (true && slotId === 'head');
  })
  .parse(process.argv);
