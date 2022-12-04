import { Command, Argument, Option } from 'commander';
import * as dotenv from 'dotenv';
import { utils } from 'ethers';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { readValidatorsIndexesFile, getMessagesToSign, fetchGenesis } from './shared';

dotenv.config();
const program = new Command();

const getMessageMap = (messages: { message: any; signingRoot: Uint8Array }[]) => {
  return messages.reduce((acc, { message, signingRoot }) => {
    acc[utils.hexlify(signingRoot)] = message;
    return acc;
  }, {} as any);
};

const saveMessagesToFile = (signedMessages: any, filePath: string) => {
  const fileContent = JSON.stringify(signedMessages);
  writeFileSync(filePath, fileContent);
};

const getMessageSignatures = (fileName: string) => {
  const sourceContent = readFileSync(fileName, 'utf8');
  const parsed = JSON.parse(sourceContent) as any[];
  const sorted = parsed.sort((a, b) => a.signingRoot.localeCompare(b.signingRoot));
  const content = JSON.stringify(sorted);

  return [sorted, content] as const;
};

const readMessageSignatures = (dir: string) => {
  const files = readdirSync(dir);

  if (!files.length) {
    throw new Error('No signature files are found');
  }

  const [firstFile, ...rest] = files;
  const [signatures, firstFileContent] = getMessageSignatures(`${dir}/${firstFile}`);

  const isAllFileTheSame = rest.every((fileName) => {
    const [, content] = getMessageSignatures(`${dir}/${firstFile}`);
    return firstFileContent === content;
  });

  if (!isAllFileTheSame) {
    throw new Error('Reconstructed signatures are not the same');
  }

  return signatures;
};

const mergeMessagesWithSignatures = (messagesMap: any, signatures: any[]) => {
  return signatures
    .map(({ signingRoot, signature }) => {
      const message = messagesMap[signingRoot];
      if (!message) return undefined;

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
      const signatures = readMessageSignatures(signaturesDir);
      console.log('Signatures are read:', signatures.length);
      console.log('-----');

      /**
       * Merge messages with signatures
       */
      console.log('Merging messages with signing roots...');
      const genesis = await fetchGenesis(consensusLayer);
      const messages = getMessagesToSign(validatorIndexes, publicKey, forkVersion, genesis, toExecutionAddress);
      const messagesMap = getMessageMap(messages);
      const resultMessages = mergeMessagesWithSignatures(messagesMap, signatures);

      saveMessagesToFile(resultMessages, outputFilePath);
      console.log('The messages saved to:', outputFilePath);
    },
  )
  .parse(process.argv);
