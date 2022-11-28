import { Command, Argument } from 'commander';
import { utils } from 'ethers';

const PUBKEY_LENGTH = 48;

const { arrayify, hexlify, isHexString, sha256, base64 } = utils;

const pubkeyToBytes = (string: string): Uint8Array => {
  if (isHexString(string)) {
    return arrayify(string);
  }

  if (isHexString(`0x${string}`)) {
    return arrayify(`0x${string}`);
  }

  return base64.decode(string);
};

const validatePubkey = (bytes: Uint8Array): void => {
  if (bytes.length !== PUBKEY_LENGTH) {
    throw new Error('Pubkey has incorrect length');
  }
};

const hashToWithdrawalCredentials = (pubkeyHash: string): string => {
  const bytes = arrayify(pubkeyHash);
  bytes[0] = 0;
  return hexlify(bytes);
};

const program = new Command();

program
  .addArgument(new Argument('<pubkey>', 'Public key in base64 or hex format to convert to withdrawal credentials'))
  .action((pubkey) => {
    const bytes = pubkeyToBytes(pubkey);
    validatePubkey(bytes);

    const pubkeyHash = sha256(bytes);
    const withdrawalCredentials = hashToWithdrawalCredentials(pubkeyHash);

    console.table({
      'Public key': pubkey,
      'Withdrawal credentials': withdrawalCredentials,
    });
  })
  .parse(process.argv);
