#!/bin/bash

source nodes-config.sh
set -e

##
# Validate args
#

if [ "$1" = "" ]
then
	echo "Deposit data path is required"
	exit 1
fi

DEPOSIT_DATA=$(readlink -f "$1")

if [ ! -f "$DEPOSIT_DATA" ]; then
	echo "Deposit data file is not exist" && exit 1
fi


##
# Build Prysm
#

cd $PRYSM_DIR
bazel build //cmd/prysmctl
bazel build //cmd/beacon-chain
bazel build //cmd/validator
cd ../


##
# Build Geth
#

cd $GETH_DIR
make geth
cd ../


##
# Clean dirs
#

if [ -d "$DATA_DIR" ]
then
rm -r $DATA_DIR
fi

mkdir $DATA_DIR
mkdir $PRYSM_DATA_DIR
mkdir $GETH_DATA_DIR

##
# Setup Prysm
#

cd $PRYSM_DIR

bazel run //cmd/validator -- accounts import \
  --keys-dir=$(dirname $DEPOSIT_DATA) \
	--wallet-dir=$VALIDATOR_DATA_DIR/wallet \
	--wallet-password-file=$CONFIG_DIR/wallet-password.txt \
	--account-password-file=$CONFIG_DIR/keystore-password.txt

GENESIS=$(($(date +%s) + 60)) # 180s until genesis

bazel run //cmd/prysmctl -- testnet generate-genesis \
	--num-validators=0 \
	--deposit-json-file=$DEPOSIT_DATA \
	--output-ssz=$PRYSM_DATA_DIR/genesis.ssz \
	--chain-config-file=$CONFIG_DIR/config.yml \
	--genesis-time=$GENESIS

cd ../

##
# Setup Geth
#

SHANGHAI=$(($GENESIS + 144))
cp $CONFIG_DIR/genesis.json $CONFIG_DIR/generated-genesis.json
sed -i -e 's/XXX/'$SHANGHAI'/' $CONFIG_DIR/generated-genesis.json

cd $GETH_DIR
./build/bin/geth --datadir $GETH_DATA_DIR init $CONFIG_DIR/generated-genesis.json
./build/bin/geth account import --password $CONFIG_DIR/password.txt --datadir $GETH_DATA_DIR $CONFIG_DIR/privatekey.txt
cd ../
