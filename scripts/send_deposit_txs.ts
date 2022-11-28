import { Command, Option } from 'commander';
import { readFileSync } from 'fs';
import { Contract, Wallet, providers, BigNumber } from 'ethers';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import ProgressBar from 'progress';

dotenv.config();

const getDepositData = (filePath: string) => {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as any[];

  return parsed.map(({ pubkey, signature, withdrawal_credentials, deposit_data_root, amount }) => {
    return {
      pubkey: `0x${pubkey}`,
      signature: `0x${signature}`,
      withdrawal_credentials: `0x${withdrawal_credentials}`,
      deposit_data_root: `0x${deposit_data_root}`,
      value: BigNumber.from(amount).mul(1e9).toHexString(),
    };
  });
};

const getDepositContractAddress = async (consensusLayerURL: string) => {
  const url = new URL('/eth/v1/config/deposit_contract', consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = await response.json();

  return data.address as string;
};

const getWallet = (privateKey: string, provider: providers.Provider) => {
  return new Wallet(privateKey, provider);
};

const getProvider = (executionLayerURL: string) => {
  return new providers.JsonRpcProvider(executionLayerURL);
};

const getDepositContract = async (address: string, wallet: Wallet) => {
  const abi = [
    'function deposit(bytes calldata pubkey, bytes calldata withdrawal_credentials, bytes calldata signature, bytes32 deposit_data_root) external payable',
  ];

  return new Contract(address, abi, wallet);
};

const program = new Command();

program
  .addOption(new Option('-d, --deposit-data-path <path>', 'Path to deposit data file').makeOptionMandatory())
  .addOption(
    new Option('-e, --execution-layer <string>', 'Execution layer node URL')
      .env('EXECUTION_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(
    new Option('-p, --private-key <string>', 'Account PK to send transactions')
      .env('PRIVATE_KEY')
      .makeOptionMandatory(),
  )
  .action(async ({ depositDataPath, consensusLayer, executionLayer, privateKey }) => {
    const provider = getProvider(executionLayer);
    const wallet = getWallet(privateKey, provider);

    const depositData = getDepositData(depositDataPath);
    const depositContractAddress = await getDepositContractAddress(consensusLayer);
    const depositContract = await getDepositContract(depositContractAddress, wallet);

    console.table({
      'Sender address:': wallet.address,
      'Deposit contract address:': depositContract.address,
    });

    const total = depositData.length;
    const sendBar = new ProgressBar('Send transactions [:bar] :current/:total', { total });
    const confirmBar = new ProgressBar('Confirm transactions [:bar] :current/:total', { total });
    const txList: any[] = [];

    for (const txData of depositData) {
      const { pubkey, signature, withdrawal_credentials, deposit_data_root, value } = txData;
      const tx = await depositContract.deposit(pubkey, withdrawal_credentials, signature, deposit_data_root, {
        gasLimit: 100000,
        value,
      });

      txList.push(tx);
      sendBar.tick(1);
    }

    Promise.all(
      txList.map(async (tx) => {
        await tx.wait();
        confirmBar.tick();
      }),
    );
  })
  .parse(process.argv);
