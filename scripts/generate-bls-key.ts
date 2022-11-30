import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { SecretKey } from '@chainsafe/blst';
import { utils } from 'ethers';

dotenv.config();
const program = new Command();

const { hexlify, randomBytes } = utils;

program
  .action(() => {
    const randomValue = randomBytes(32);

    const secretKey = SecretKey.fromKeygen(randomValue);
    const publicKey = secretKey.toPublicKey();

    console.table({
      'Secret key': hexlify(secretKey.toBytes()),
      'Public key': hexlify(publicKey.toBytes()),
    });
  })
  .parse(process.argv);
