import { Command, Argument, Option } from 'commander';
import * as dotenv from 'dotenv';
import { utils } from 'ethers';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { readValidatorsIndexesFile, getMessagesToSign, fetchGenesis } from './shared';

dotenv.config();
const program = new Command();

const saveMessagesToFile = (signedMessages: any, filePath: string) => {
  const fileContent = JSON.stringify(signedMessages);
  writeFileSync(filePath, fileContent);
};

const getMessageSignatures = (fileName: string) => {
  const sourceContent = readFileSync(fileName, 'utf8');
  return JSON.parse(sourceContent) as any[];
};

const readMessageSignatures = (dir: string) => {
  const files = readdirSync(dir);

  if (!files.length) {
    throw new Error('No signature files are found');
  }

  const signaturesMap = files.reduce((acc, fileName) => {
    const signatures = getMessageSignatures(`${dir}/${fileName}`);
    signatures.forEach(({ signingRoot, signature }) => {
      if (acc[signingRoot] == null) {
        acc[signingRoot] = signature;
      }

      if (acc[signingRoot] !== signature) {
        throw new Error(`Reconstructed signatures are not the same for root: ${signingRoot}`);
      }
    });

    return acc;
  }, {} as any);

  return signaturesMap;
};

const mergeMessagesWithSignatures = (messages: { message: any; signingRoot: Uint8Array }[], signaturesMap: any) => {
  return messages
    .map(({ message, signingRoot }) => {
      const signature = signaturesMap[utils.hexlify(signingRoot)];
      if (!signature) return undefined;

      return { message, signature };
    })
    .filter((v) => v);
};

program
  .addArgument(new Argument('<indexes-file-path>', 'Path to validator indexes file'))
  .addArgument(new Argument('<signatures-dir>', 'Path to reconstructed signatures dir'))
  .addArgument(new Argument('<output-file-path>', 'Output file path to messages'))
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-f, --fork-version <string>', 'Capella fork version').makeOptionMandatory())
  .addOption(new Option('-p, --public-key <string>', 'BLS public key').makeOptionMandatory())
  .addOption(new Option('-t, --to-execution-address <string>', 'To Execution Layer address').makeOptionMandatory())
  .action(
    async (
      indexesFile,
      signaturesDir,
      outputFilePath,
      { forkVersion, consensusLayer, publicKey, toExecutionAddress },
    ) => {
      /**
       * Read the validator indexes file content
       * Indexes must be separated by `\n`
       */
      console.log('Reading validator indexes from file...');
      const validatorIndexes = readValidatorsIndexesFile(indexesFile);
      console.log('Validator indexes are read:', validatorIndexes.length);
      console.log('-----');

      /**
       * Read reconstructed signatures from dir
       */
      console.log('Reading signatures from dir...');
      const signaturesMap = readMessageSignatures(signaturesDir);
      const reconstructedSignaturesLength = Object.keys(signaturesMap).length;
      console.log('Signatures are read:', reconstructedSignaturesLength);
      console.log('-----');

      /**
       * Merge messages with signatures
       */
      console.log('Merging messages with signing roots...');
      const genesis = await fetchGenesis(consensusLayer);
      const messages = getMessagesToSign(validatorIndexes, publicKey, forkVersion, genesis, toExecutionAddress);
      const signedMessages = mergeMessagesWithSignatures(messages, signaturesMap);
      const signedMessagesLength = signedMessages.length;

      if (signedMessagesLength !== reconstructedSignaturesLength) {
        console.warn('The number of signatures does not match the number of messages', {
          signedMessagesLength,
          reconstructedSignaturesLength,
        });
      }

      saveMessagesToFile(signedMessages, outputFilePath);
      console.log('The messages saved to:', outputFilePath);
    },
  )
  .parse(process.argv);
