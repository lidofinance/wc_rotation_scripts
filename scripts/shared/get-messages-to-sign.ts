import { utils } from 'ethers';
import { BLSToExecutionChange } from '../ssz';
import { DOMAIN_BLS_TO_EXECUTION_CHANGE } from './constants';
import { computeDomain } from './domain';
import { Genesis } from './interfaces';
import { computeSigningRoot } from './signing-root';

const { arrayify } = utils;

export const getMessagesToSign = (
  validatorIndexes: number[],
  publicKey: string,
  genesis: Genesis,
  toExecutionAddress: string,
) => {
  const forkVersionBytes = arrayify(genesis.genesis_fork_version);
  const genesisValidatorRoot = arrayify(genesis.genesis_validators_root);
  const domain = computeDomain(DOMAIN_BLS_TO_EXECUTION_CHANGE, forkVersionBytes, genesisValidatorRoot);

  return validatorIndexes.map((validatorIndex) => {
    const message = {
      validator_index: String(validatorIndex),
      from_bls_pubkey: publicKey,
      to_execution_address: toExecutionAddress,
    };

    const sszObject = BLSToExecutionChange.fromJson(message);
    const signingRoot = computeSigningRoot(BLSToExecutionChange, sszObject, domain);

    return { message, signingRoot };
  });
};
