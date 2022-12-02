import { Command, Argument, Option } from 'commander';
import * as dotenv from 'dotenv';
import { verify, PublicKey, Signature } from '@chainsafe/blst';
import { utils } from 'ethers';
import {
  computeDomain,
  fetchGenesis,
  Genesis,
  computeSigningRoot,
  DOMAIN_BLS_TO_EXECUTION_CHANGE,
  readRotationMessagesFile,
  SignedBLSToExecutionChange,
} from './shared';
import { BLSToExecutionChange } from './ssz';

dotenv.config();
const program = new Command();

const { arrayify } = utils;

const verifyRotationMessages = (messages: SignedBLSToExecutionChange[], forkVersion: string, genesis: Genesis) => {
  const forkVersionBytes = arrayify(forkVersion);
  const genesisValidatorRoot = arrayify(genesis.genesis_validators_root);

  return messages.map(({ message, signature }) => {
    const validatorIndex = message.validator_index;
    const pubkey = message.from_bls_pubkey;
    const pubkeyObj = PublicKey.fromBytes(arrayify(pubkey));
    const signatureObj = Signature.fromBytes(arrayify(signature));

    const sszObject = BLSToExecutionChange.fromJson(message);
    const domain = computeDomain(DOMAIN_BLS_TO_EXECUTION_CHANGE, forkVersionBytes, genesisValidatorRoot);
    const signingRoot = computeSigningRoot(BLSToExecutionChange, sszObject, domain);
    const result = verify(signingRoot, pubkeyObj, signatureObj);

    return { validatorIndex, pubkey, result };
  });
};

program
  .addArgument(new Argument('<input-file-path>', 'Input file path to messages'))
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-f, --fork-version <string>', 'Capella fork version').makeOptionMandatory())
  .action(async (inputFilePath, { consensusLayer, forkVersion }) => {
    /**
     * Read rotation messages
     */
    console.log('Reading rotation messages file...');
    const messages = readRotationMessagesFile(inputFilePath);
    console.log('Messages are read:', messages.length);
    console.log('-----');

    /**
     * Sign the rotation messages
     */
    console.log('Validating the rotation messages...');
    const genesis = await fetchGenesis(consensusLayer);
    const result = verifyRotationMessages(messages, forkVersion, genesis);

    console.table(result);
  })
  .parse(process.argv);
