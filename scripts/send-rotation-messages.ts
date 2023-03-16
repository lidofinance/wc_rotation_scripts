import { Command, Argument, Option } from 'commander';
import prompts from 'prompts';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import ProgressBar from 'progress';
import { readRotationMessagesFile } from './shared';

dotenv.config();
const program = new Command();

const validateIndexes = (fromIndex: number, toIndex: number, maxIndex: number) => {
  if (!Number.isFinite(fromIndex)) {
    throw new Error('From index is not a number');
  }

  if (!Number.isFinite(toIndex)) {
    throw new Error('To index is not a number');
  }

  if (toIndex < fromIndex) {
    throw new Error('To index is less than from index');
  }

  if (toIndex > maxIndex) {
    throw new Error('To index is greater than max index');
  }
};

const sendRotationMessages = async (messages: any[], consensusLayerURL: string, fromIndex: number, toIndex: number) => {
  const url = new URL('eth/v1/beacon/pool/bls_to_execution_changes', consensusLayerURL);
  const messagesBar = new ProgressBar('Sending messages [:bar] :current/:total', { total: messages.length });

  for (let i = fromIndex; i <= toIndex; i++) {
    const sourceMessage = messages[i].message;
    const signature = messages[i].signature;

    const message = {
      validator_index: String(sourceMessage.validator_index),
      from_bls_pubkey: sourceMessage.from_bls_pubkey,
      to_execution_address: sourceMessage.to_execution_address,
    };

    const response = await fetch(url.toString(), {
      method: 'post',
      body: JSON.stringify([{ message, signature }]),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 200) {
      const { message } = await response.json();
      throw new Error(message);
    }

    messagesBar.tick(1);
  }
};

program
  .addArgument(new Argument('<file-path>', 'Path to rotation messages file'))
  .addOption(
    new Option('-c, --consensus-layer <string>', 'Consensus layer node URL')
      .env('CONSENSUS_LAYER')
      .makeOptionMandatory(),
  )
  .addOption(new Option('-f, --from-index <number>', 'From index of rotation messages to send').argParser(parseInt))
  .addOption(new Option('-t, --to-index <number>', 'To index of rotation messages to send').argParser(parseInt))
  .action(async (filePath, { consensusLayer, fromIndex, toIndex }) => {
    /**
     * Read rotation messages
     */
    console.log('Reading rotation messages file...');
    const messages = readRotationMessagesFile(filePath);
    console.log('Messages are read:', messages.length);
    console.log('-----');

    const maxIndex = messages.length - 1;

    if (fromIndex == null) fromIndex = 0;
    if (toIndex == null) toIndex = maxIndex;

    validateIndexes(fromIndex, toIndex, maxIndex);

    console.table({
      File: filePath,
      Messages: messages.length,
      'From index': fromIndex,
      'To index': toIndex,
    });

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      initial: true,
    });

    if (!confirm) return;

    await sendRotationMessages(messages, consensusLayer, fromIndex, toIndex);
  })
  .parse(process.argv);
