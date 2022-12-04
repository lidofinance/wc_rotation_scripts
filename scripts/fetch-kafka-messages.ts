import { Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import { Kafka, logLevel } from 'kafkajs';
import { closeConnectionOnError, closeConnectionOnStop } from './shared';

dotenv.config();
const program = new Command();

const GROUP_ID = 'rotation-scripts';

program
  .addOption(new Option('-c, --client-id <string>', 'Kafka client id').env('KAFKA_CLIENT_ID').makeOptionMandatory())
  .addOption(new Option('-t, --topic <string>', 'Kafka topic').env('KAFKA_TOPIC').makeOptionMandatory())
  .addOption(new Option('-u, --username <string>', 'Kafka username').env('KAFKA_USERNAME').makeOptionMandatory())
  .addOption(new Option('-p, --password <string>', 'Kafka password').env('KAFKA_PASSWORD').makeOptionMandatory())
  .addOption(new Option('-b, --broker <string>', 'Kafka broker').env('KAFKA_BROKER_ADDRESS').makeOptionMandatory())
  .addOption(new Option('-s, --start-from <string>', 'Start date').default(0))
  .action(async ({ clientId, topic, username, password, broker, startFrom }) => {
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
      logLevel: logLevel.DEBUG,
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

        console.log(parsed.event);
      },
    });
  })
  .parse(process.argv);
