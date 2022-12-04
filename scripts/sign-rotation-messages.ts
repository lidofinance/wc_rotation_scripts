import { Command, Argument, Option } from 'commander';
import * as dotenv from 'dotenv';
import { SecretKey } from '@chainsafe/blst';
import { utils } from 'ethers';
import { writeFileSync } from 'fs';
import { readValidatorsIndexesFile, getMessagesToSign, fetchGenesis, Genesis } from './shared';

dotenv.config();
const program = new Command();

const { arrayify, hexlify } = utils;

const signRotationMessages = (
  validatorIndexes: number[],
  forkVersion: string,
  genesis: Genesis,
  blsSecretKey: SecretKey,
  toExecutionAddress: string,
) => {
  const publicKey = hexlify(blsSecretKey.toPublicKey().toBytes());
  const messages = getMessagesToSign(validatorIndexes, publicKey, forkVersion, genesis, toExecutionAddress);

  return messages.map(({ message, signingRoot }) => {
    const signature = hexlify(blsSecretKey.sign(signingRoot).toBytes());
    return { message, signature };
  });
};

const saveSignedMessagesToFile = (signedMessages: any, filePath: string) => {
  const fileContent = JSON.stringify(signedMessages);
  writeFileSync(filePath, fileContent);
};

program
  .addArgument(new Argument('<input-file-path>', 'Input file path to validator indexes file'))
  .addArgument(new Argument('<output-file-path>', 'Output file path to messages'))
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(
    new Option('-b, --bls-secret-key <string>', 'BLS secret key to sign messages')
      .env('BLS_SECRET_KEY')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-f, --fork-version <string>', 'Capella fork version').makeOptionMandatory())
  .addOption(new Option('-t, --to-execution-address <string>', 'To Execution Layer address').makeOptionMandatory())
  .action(async (inputFilePath, outputFilePath, { blsSecretKey, forkVersion, consensusLayer, toExecutionAddress }) => {
    const secretKey = SecretKey.fromBytes(arrayify(blsSecretKey));

    /**
     * Read the validator indexes file content
     * Indexes must be separated by `\n`
     */
    console.log('Reading validator indexes from file...');
    const validatorIndexes = readValidatorsIndexesFile(inputFilePath);
    console.log('Validator indexes are read:', validatorIndexes.length);
    console.log('-----');

    /**
     * Sign the rotation messages
     */
    console.log('Signing the rotation messages...');
    const genesis = await fetchGenesis(consensusLayer);
    const signedMessages = signRotationMessages(validatorIndexes, forkVersion, genesis, secretKey, toExecutionAddress);
    saveSignedMessagesToFile(signedMessages, outputFilePath);
    console.log('Signing complete. The messages saved to:', outputFilePath);
  })
  .parse(process.argv);
