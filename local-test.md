# Local rotation signing

## Prepared vars

Withdrawal credentials:

- bls secret key: `0x1ea4b89a9fba8273b1cf4f60de95a8566c7240a07eb1965647d16dbb9ea69972`
- public key: `0xb5da736ffc00b7bbeb256c1084b537fc31431e1315857429dd5657bcc009cf36c8f9f2d45565b56588df9f3f59cb6b7d`
- withdrawal credentials: `0x00e4ef670e3a6795beae66c301a04e914f096b2496026a9d96be723beafa2e1b`

Account to send deposit transactions from:

- address: 0x08385bD3728d296a3C3566A59b07a970745C87fE
- private key: 0x5f7d1b3383c6aa9616c2fe965094f5db1cb795b49014c4af73fba39fe19df721

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

```
BLS_SECRET_KEY=0x1ea4b89a9fba8273b1cf4f60de95a8566c7240a07eb1965647d16dbb9ea69972
PRIVATE_KEY=0x5f7d1b3383c6aa9616c2fe965094f5db1cb795b49014c4af73fba39fe19df721
```

Step 4. Generate validator deposit data and remember the file name

```bash
./generate-deposit-data.sh 0x00e4ef670e3a6795beae66c301a04e914f096b2496026a9d96be723beafa2e1b
```

Get the file name:

```
ls data/validator_keys/deposit_data*.json
```

Step 5. Setup nodes

```bash
./nodes-setup.sh data/validator_keys/<FILE_NAME_FROM_PREVIOUS_STEP>
```

Or use reinit if you already have imported validator keys:

```bash
./nodes-reinit.sh data/validator_keys/<FILE_NAME_FROM_PREVIOUS_STEP>
```

Step 6. Run nodes in separate terminals

```
./nodes-start-prysm.sh
```

```
./nodes-start-validators.sh
```

```
./nodes-start-geth.sh
```

Step 7. Wait for bellatrix

```
curl -s http://localhost:3500/eth/v2/beacon/blocks/head | jq '{version: .version, slot:.data.message.slot}'
```

Step 8. Send deposit transactions (they don't really count, but we need deposits events for our script to work correctly)

```bash
yarn send-deposit-txs data/validator_keys/<FILE_NAME_FROM_PREVIOUS_STEP>
```

Step 9. Wait while CL reaches deposits on EL and then fetch validators by withdrawal credentials from EL and CL nodes and fill a file with validator indexes to rotate

```bash
yarn fetch-validators-by-wc -w 0x00e4ef670e3a6795beae66c301a04e914f096b2496026a9d96be723beafa2e1b data/testnet-validators.csv
```

Step 10. Sign rotation messages

```
yarn sign-rotation-messages -t 0xa5F1d7D49F581136Cf6e58B32cBE9a2039C48bA1 data/testnet-validators.csv data/testnet-rotation-messages.json
```

Step 11. Validate rotation messages locally

```
yarn validate-rotation-messages data/testnet-rotation-messages.json
```

Step 12. Get validators statistic, make sure that all validators have 0x00 withdrawal credentials type

```
yarn get-validators-statistic data/testnet-validators.csv -s head
```

Step 13. Send rotation messages to the chain

```
yarn send-rotation-messages data/testnet-rotation-messages.json
```

Step 14. Get validators statistic again, make sure that withdrawal credentials started to change to 0x01

```
yarn get-validators-statistic data/testnet-validators.csv -s head
```
