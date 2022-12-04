# Scripts for withdrawal credential rotation ceremony

## Install

Step 1. Init submodules

```bash
git submodule update --init --recursive
```

Step 1. Install deps

```bash
yarn
```

Step 2. Create `.env` file from the template

```bash
cp sample.env .env
```

Step 3. Fill out the `.env` file

## Scripts

Some scripts may require some of the following environment variables to be set:

- `EXECUTION_LAYER` – RPC URL of execution layer client
- `CONSENSUS_LAYER` – API URL of consensus layer client
- `KAFKA_CLIENT_ID` – A logical identifier of an application
- `KAFKA_TOPIC` – Kafka topic
- `KAFKA_USERNAME` – Kafka username
- `KAFKA_PASSWORD` – Kafka password
- `KAFKA_BROKER_ADDRESS` – Kafka broker address (`kafka1:9092`)

### Expand signing roots

The script is used to merge the validator indexes from the `.csv` file with the signatures obtained from kafka.

```bash
yarn expand-signing-roots data/validators.csv data/signatures data/output.json -f 0x03000000 -p 0xb67aca71f04b673037b54009b760f1961f3836e5714141c892afdb75ec0834dce6784d9c72ed8ad7db328cff8fe9f13e -t 0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f
```

Options:

- `-p`, `--public-key`, required – public key of BSL withdrawal credentials
- `-t`, `--to-execution-address`, required – address on execution layer to which the rotation is performed
- `-f`, `--fork-version`, required – fork version, to which the message signatures are valid. [`0x03000000` for Capella](https://github.com/ethereum/consensus-specs/blob/dev/specs/capella/fork.md#configuration)

Arguments:

- `validators indexes path`, required – path to the input csv file with validator indexes
- `signatures dir path`, required – path to the dir with reconstructed signature files
- `output file path`, required – path to the output json file with rotation messages

The script requires env variables to be set:

- `CONSENSUS_LAYER`

### Fetch kafka messages

The script is used to get the reconstructed signature data from kafka and save them to files.

```bash
yarn fetch-kafka-messages -s 12.01.2022 data/signatures
```

Options:

- `-s`, `--start-from`, optional – date in text format from which the messages will be read out

Arguments:

- `output dir path`, required – path to the output dir for reconstructed signatures

The script requires env variables to be set:

- `KAFKA_CLIENT_ID`
- `KAFKA_TOPIC`
- `KAFKA_USERNAME`
- `KAFKA_PASSWORD`
- `KAFKA_BROKER_ADDRESS`

### Fetch rotation pool

The scripts fetches BLS to execution changes pool of messages and print the statistic.

```bash
yarn fetch-rotation-pool data/validators.csv
```

Arguments:

- `file path`, required – path to the output file

The script requires env variables to be set:

- `CONSENSUS_LAYER`

### Fetch validators indexes by withdrawal credentials

The script fetches data about validators from Consensus Layer and Execution Layer which matches to the passed withdrawal credentials and generates a CSV file with validator indexes. This file can later be used in [dc4bc](https://github.com/lidofinance/dc4bc/) to sign messages to rotate withdrawal credentials from type `0x00` to `0x01`.

The data is fetched from the deposit contract on Execution Layer and the form the finalized state on Consensus Layer to reduce the risk of incorrect data.

```bash
yarn fetch-validators-by-wc -w 0x009690e5d4472c7c0dbdf490425d89862535d2a52fb686333f3a0a9ff5d2125e data/validators.csv
```

Options:

- `-w`, `--withdrawal-credentials`, required – withdrawal_credentials by which validators will be filtered
- `-s`, `--fetch-step`, optional – step with which events from deposit contract are requested. Reduce this value if there are problems with fetching data (100,000 by default)

Arguments:

- `file path`, required – path to the output file

The script requires env variables to be set:

- `EXECUTION_LAYER`
- `CONSENSUS_LAYER`

File format:

```
1001
1002
2024
...
4242
```

### Get validators statistic

The script collects validators statistic from Consensus Layer on a certain state id.

```bash
yarn get-validators-statistic data/validators.csv
```

Options:

- `-s`, `--slot-id`, optional – state identifier, one of `head`, `genesis`, `finalized`, `justified`, `<slot>`, `<hex encoded stateRoot with 0x prefix>`

Arguments:

- `file path`, required – path to the input file

File format:

```
1001
1002
2024
...
4242
```

### Send rotation messages

The scripts sends messages to Consensus Layer node to rotate withdrawal credentials from `0x00` to `0x01` type.

```bash
yarn send-rotation-messages data/rotation_messages.json
```

Options:

- `-f`, `--from-index`, optional – from index of rotation messages to send
- `-t`, `--to-index`, optional – to index of rotation messages to send

Arguments:

- `file path`, required – path to the input file

File format:

```json
[
  {
    "message": {
      "validator_index": 1,
      "from_bls_pubkey": "0x93247f2209abcacf57b75a51dafae777f9dd38bc7053d1af526f220a7489a6d3a2753e5f3e8b1cfe39b56f43611df74a",
      "to_execution_address": "0xabcf8e0d4e9587369b2301d0790347320302cc09"
    },
    "signature": "0x1b66ac1fb663c9bc59509846d6ec05345bd908eda73e670af888da41af171505cc411d61252fb6cb3fa0017b679f8bb2305b26a285fa2737f175668d0dff91cc1b66ac1fb663c9bc59509846d6ec05345bd908eda73e670af888da41af171505"
  }
]
```

### Validate rotation messages

The script validates signature of message to rotate withdrawal credentials from `0x00` to `0x01` type.

```bash
yarn validate-rotation-messages -f 0x03000000 data/validators.json
```

Options:

- `-f`, `--fork-version`, required – fork version, to which the message signatures are valid. [`0x03000000` for Capella](https://github.com/ethereum/consensus-specs/blob/dev/specs/capella/fork.md#configuration)

Arguments:

- `file path`, required – path to the input json file with signed messages

The script requires env variables to be set:

- `CONSENSUS_LAYER`

### Validate validators indexes file

The script validates data from the validator indexes file:

- Checks gaps in message indexes and their order
- Checks that the file has the same number of validators as in Consensus Layer with the passed withdrawal credential
- Checks that all the validator indexes correspond to the validators on the Consensus Layer with the passed withdrawal credentials

```bash
yarn validate-validators-indexes -w 0x009690e5d4472c7c0dbdf490425d89862535d2a52fb686333f3a0a9ff5d2125e data/validators.csv
```

Options:

- `-w`, `--withdrawal-credentials`, required – withdrawal_credentials by which validators will be filtered
- `-s`, `--slot-id`, optional – state identifier, one of `head`, `genesis`, `finalized`, `justified`, `<slot>`, `<hex encoded stateRoot with 0x prefix>`

Arguments:

- `file path`, required – path to the input csv file with validator indexes

The script requires env variables to be set:

- `CONSENSUS_LAYER`

## Testnet scripts

Some scripts may require some of the following environment variables to be set:

- `EXECUTION_LAYER` – RPC URL of execution layer client
- `CONSENSUS_LAYER` – API URL of consensus layer client
- `PRIVATE_KEY` – `0x` prefixed private key of account with some eth to send transactions
- `BLS_SECRET_KEY` – `0x` prefixed BLS secret key to sign rotation messages

### Convert public key to withdrawal credentials

The script converts a public key into a withdrawal credentials 0x00 type. It takes the `sha256` from the public key and replaces the first byte to 0.

```bash
yarn convert-pubkey-to-wc tnrKcfBLZzA3tUAJt2Dxlh84NuVxQUHIkq/bdewINNzmeE2ccu2K19syjP+P6fE+
```

Arguments:

- `public key`, required – public key in `base64` or `hex` format to convert to withdrawal credentials

### Generate BLS key

The scripts generates BLS key for signing

```bash
yarn generate-bls-key
```

### Send deposit transactions

The script sends deposit transactions to the deposit contract from deposit data file generated by [staking deposit cli](https://github.com/ethereum/staking-deposit-cli).

```bash
yarn send-deposit-txs data/deposit_data.json
```

Options:

- `-d`, `--deposit-contract-address`, optional – the deposit contract address, if it's not specified the script will try to get it from Consensus Layer

Arguments:

- `deposit data path`, required – path to a deposit data file

The script requires env variables to be set:

- `EXECUTION_LAYER`
- `CONSENSUS_LAYER`
- `PRIVATE_KEY`

### Sign rotation messages

The script generates and sign messages to rotate withdrawal credentials. Once executed, it will generate a file that needs to be sent to the network.

```bash
yarn sign-rotation-messages -t 0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f -f 0x03000000 data/validators.csv data/rotation_messages.json
```

Options:

- `-t`, `--to-execution-address`, required – address on execution layer to which the rotation is performed
- `-f`, `--fork-version`, required – fork version, to which the message signatures are valid. [`0x03000000` for Capella](https://github.com/ethereum/consensus-specs/blob/dev/specs/capella/fork.md#configuration)

Arguments:

- `input file path`, required – path to the input csv file with validator indexes
- `output file path`, required – path to the output json file with signed messages

The script requires env variables to be set:

- `CONSENSUS_LAYER`
- `BLS_SECRET_KEY`

## Run Nodes

Step 1. Generate deposit data

```bash
./generate-deposit-data.sh <withdrawal-credentials>
```

Step 2. Build and configure nodes

```bash
./nodes-setup.sh <path to deposit data json>
```

Use the path to the file that was generated on the previous step

Step 3. Run Prysm node

In a separate terminal, run:

```bash
./nodes-start-prysm.sh
```

Step 4. Run validators

In a separate terminal, run:

```bash
./nodes-start-validators.sh
```

Step 5. Run Geth node

In a separate terminal, run:

```bash
./nodes-start-geth.sh
```
