import { Argument, Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import { Kafka, logLevel } from 'kafkajs';
import { utils } from 'ethers';
import { closeConnectionOnError } from './shared';
import { writeFileSync } from 'fs';

dotenv.config();
const program = new Command();

const { base64, hexlify, toUtf8String } = utils;
const GROUP_ID = 'rotation-scripts';

const writeMessageToFile = (data: any, fileName: string) => {
  const fileContent = JSON.stringify(data, null, 2);
  writeFileSync(fileName, fileContent);
};

const processEvent = (message: any, outputDir: string) => {
  if (message.event === 'signature_reconstructed') {
    const payloadJson = toUtf8String(base64.decode(message.data));
    const payload = JSON.parse(payloadJson);

    const data = payload.map((item: any) => {
      return {
        signingRoot: hexlify(base64.decode(item.SrcPayload)),
        signature: hexlify(base64.decode(item.Signature)),
      };
    });

    console.log('Signatures are collected', data.length);

    const fileName = `${outputDir}/${message.id}.json`;
    writeMessageToFile(data, fileName);
  }
};

program
  .addOption(new Option('-c, --client-id <string>', 'Kafka client id').env('KAFKA_CLIENT_ID').makeOptionMandatory())
  .addOption(new Option('-t, --topic <string>', 'Kafka topic').env('KAFKA_TOPIC').makeOptionMandatory())
  .addOption(new Option('-u, --username <string>', 'Kafka username').env('KAFKA_USERNAME').makeOptionMandatory())
  .addOption(new Option('-p, --password <string>', 'Kafka password').env('KAFKA_PASSWORD').makeOptionMandatory())
  .addOption(new Option('-b, --broker <string>', 'Kafka broker').env('KAFKA_BROKER_ADDRESS').makeOptionMandatory())
  .addOption(new Option('-s, --start-from <string>', 'Start date').default(0))
  .addArgument(new Argument('<output-dir>', 'Output dir for reconstructed signatures'))
  .action(async (outputDir, { clientId, topic, username, password, broker, startFrom }) => {
    const groupId = GROUP_ID;

    const kafka = new Kafka({
      clientId,
      brokers: [broker],
      ssl: true,
      sasl: {
        mechanism: 'plain',
        username,
        password,
      },
      logLevel: logLevel.ERROR,
    });

    /**
     * Set the offsets
     */
    if (startFrom) {
      console.log('Start date is provided, setting the offsets...');
      const timestamp = Math.floor(+new Date(startFrom));

      const admin = kafka.admin();
      const partitions = await admin.fetchTopicOffsetsByTimestamp(topic, timestamp);

      await admin.setOffsets({ groupId, topic, partitions });
      console.log('Offsets are set');
      console.log('-----');
    }

    /**
     * Setup consumer
     */

    const consumer = kafka.consumer({ groupId });
    await consumer.connect();

    // await closeConnectionOnStop(consumer);
    await closeConnectionOnError(consumer);

    await consumer.subscribe({ topics: [topic] });

    /**
     * Read messages
     */
    console.log('Reading messages...');

    await consumer.run({
      eachMessage: async ({ message }) => {
        const string = message.value?.toString() ?? '';
        const parsed = JSON.parse(string);

        console.log('Event received', parsed.event);
        processEvent(parsed, outputDir);
      },
    });
  })
  .parse(process.argv);
