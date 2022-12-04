import { Consumer } from 'kafkajs';

export const closeConnectionOnStop = (consumer: Consumer) => {
  let consumedTopicPartitions: Record<string, boolean> = {};
  consumer.on(consumer.events.GROUP_JOIN, async ({ payload }) => {
    const { memberAssignment } = payload;
    consumedTopicPartitions = Object.entries(memberAssignment).reduce((topics, [topic, partitions]) => {
      for (const partition in partitions) {
        topics[`${topic}-${partition}`] = false;
      }
      return topics;
    }, {} as Record<string, boolean>);
  });

  let processedBatch = true;
  consumer.on(consumer.events.FETCH_START, async () => {
    if (processedBatch === false) {
      await consumer.disconnect();
      process.exit(0);
    }

    processedBatch = false;
  });

  consumer.on(consumer.events.END_BATCH_PROCESS, async ({ payload }) => {
    const { topic, partition, offsetLag } = payload;
    consumedTopicPartitions[`${topic}-${partition}`] = offsetLag === '0';

    if (Object.values(consumedTopicPartitions).every((consumed) => Boolean(consumed))) {
      await consumer.disconnect();
      process.exit(0);
    }

    processedBatch = true;
  });
};

export const closeConnectionOnError = (consumer: Consumer) => {
  const errorTypes = ['unhandledRejection', 'uncaughtException'];
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  errorTypes.map((type) => {
    process.on(type, async (e) => {
      try {
        console.log(`process.on ${type}`);
        console.error(e);
        await consumer.disconnect();
        console.log('Disconnected from kafka');
        process.exit(0);
      } catch (_) {
        process.exit(1);
      }
    });
  });

  signalTraps.map((type) => {
    process.once(type, async () => {
      try {
        await consumer.disconnect();
      } finally {
        console.log('Disconnected from kafka');
        process.kill(process.pid, type);
      }
    });
  });
};
