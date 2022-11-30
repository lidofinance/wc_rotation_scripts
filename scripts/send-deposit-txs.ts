import { Command, Argument, Option } from 'commander';
import { readFileSync } from 'fs';
import { BigNumber, Contract } from 'ethers';
import prompts from 'prompts';
import * as dotenv from 'dotenv';
import ProgressBar from 'progress';
import { fetchDepositContract, getDepositContract, getProvider, getWallet } from './shared';

dotenv.config();
const program = new Command();

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

const sendDepositData = async (depositData: any[], depositContract: Contract) => {
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
};

program
  .addArgument(new Argument('<file-path>', 'Path to deposit data file'))
  .addOption(
    new Option('-p, --private-key <string>', 'Account PK to send transactions')
      .env('PRIVATE_KEY')
      .makeOptionMandatory(),
  )
  .addOption(
    new Option('-e, --execution-layer <string>', 'Execution layer node URL')
      .env('EXECUTION_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-c, --consensus-layer <string>', 'Consensus layer node URL').env('CONSENSUS_LAYER'))
  .addOption(new Option('-d, --deposit-contract-address <string>', 'Deposit contract address'))
  .action(async (depositDataPath, { consensusLayer, executionLayer, privateKey, depositContractAddress }) => {
    const provider = getProvider(executionLayer);
    const wallet = getWallet(privateKey, provider);

    if (!depositContractAddress) {
      depositContractAddress = (await fetchDepositContract(consensusLayer, 'finalized')).address;
    }

    const depositData = getDepositData(depositDataPath);
    const depositContract = await getDepositContract(depositContractAddress, wallet);

    console.table({
      'Sender address': wallet.address,
      'Deposit contract address': depositContract.address,
    });

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      initial: true,
    });

    if (!confirm) return;

    await sendDepositData(depositData, depositContract);
  })
  .parse(process.argv);
