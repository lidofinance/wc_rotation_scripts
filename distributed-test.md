# Local rotation signing

## Prepared vars

- public key: `0x8199b7a8c6998aafb30a955794f5d72a454ed1caf51bdbfc3065973153f64eeb64ff07a5b43cb9007cba3e3ec76ed756`
- withdrawal credentials: `0x000399d66d2c9d422ae57840d685771181717d7dcc3c06e01c72b1ad6834f470`

Step 1. Install deps

```bash
yarn
```

Step 2. Create `.env` file from the template

```bash
cp sample.env .env
```

Step 3. Fill out the `.env` file

```
KAFKA_CLIENT_ID=rotation-scripts-<SOMETHING_UNIQUE>
KAFKA_GROUP_ID=rotation-scripts-<SOMETHING_UNIQUE>
KAFKA_TOPIC=test_reinit
KAFKA_USERNAME=<KAFKA_USERNAME>
KAFKA_PASSWORD=<KAFKA_PASSWORD>
KAFKA_BROKER_ADDRESS=pkc-6ojv2.us-west4.gcp.confluent.cloud:9092
```

Step 4. Make sure You have 100 validators in `generate-deposit-data.sh`

Step 5. Generate validator deposit data and remember the file name

```bash
./generate-deposit-data.sh 0x000399d66d2c9d422ae57840d685771181717d7dcc3c06e01c72b1ad6834f470
```

Get the file name:

```bash
ls data/validator_keys/deposit_data*.json
```

Step 6. Setup nodes

```bash
./nodes-setup.sh data/validator_keys/<FILE_NAME_FROM_PREVIOUS_STEP>
```

Or use reinit if you already have imported validator keys:

```bash
./nodes-reinit.sh data/validator_keys/<FILE_NAME_FROM_PREVIOUS_STEP>
```

Step 7. Run nodes in separate terminals

```bash
./nodes-start-prysm.sh
```

```bash
./nodes-start-validators.sh
```

```bash
./nodes-start-geth.sh
```

Step 8. Check genesis validator root and genesis fork version

```bash
curl -s http://localhost:3500/eth/v1/beacon/genesis | jq "{genesis_validators_root: .data.genesis_validators_root, genesis_fork_version: .data.genesis_fork_version}"
```

Step 9. Send deposit transactions (they don't really count, but we need deposits events for our script to work correctly)

```bash
yarn send-deposit-txs data/validator_keys/<FILE_NAME_FROM_PREVIOUS_STEP>
```

Step 10. Wait for finality on CL and then fetch validators by withdrawal credentials from EL and CL nodes and fill a file with validator indexes to rotate

```bash
yarn fetch-validators-by-wc -w 0x000399d66d2c9d422ae57840d685771181717d7dcc3c06e01c72b1ad6834f470 data/testnet-validators.csv
```

Step 11. Wait for signing in dc4bc and fetch signatures

```bash
yarn fetch-kafka-messages data/testnet-signatures
```

or this if you want to reset the kafka offset:

```bash
yarn fetch-kafka-messages data/testnet-signatures --start-from 01.01.2023 00:00
```

Step 12. Collect signatures and convert them to the required format

```bash
yarn expand-signing-roots data/testnet-validators.csv data/signatures data/testnet-rotation-messages.json -p 0x8199b7a8c6998aafb30a955794f5d72a454ed1caf51bdbfc3065973153f64eeb64ff07a5b43cb9007cba3e3ec76ed756 -t 0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f
```

Step 13. Validate rotation messages locally

```bash
yarn validate-rotation-messages data/testnet-rotation-messages.json
```

Step 14. Get validators statistic, make sure that all validators have 0x00 withdrawal credentials type

```bash
yarn get-validators-statistic data/testnet-validators.csv -s head
```

Step 15. Send rotation messages to the chain

```bash
yarn send-rotation-messages data/testnet-rotation-messages.json
```

Step 16. Get validators statistic again, make sure that withdrawal credentials started to change to 0x01

```bash
yarn get-validators-statistic data/testnet-validators.csv -s head
```
