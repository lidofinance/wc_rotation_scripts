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

if [ ! -f "$1" ]
then
	echo "Deposit data file is not exist"
	exit 1
fi

##
# Sanity check
#

if [ ! -d "$DATA_DIR" ]
then
	echo "No data found"
	exit 1
fi


##
# Setup
#

GENESIS=$(($(date +%s) + 60)) # 180s until genesis
SHANGHAI=$(($GENESIS + 144))

if [ -d "$PRYSM_DATA_DIR" ]
then
rm -r $PRYSM_DATA_DIR
fi

if [ -d "$GETH_DATA_DIR" ]
then
rm -r $GETH_DATA_DIR
fi

if [ -d "$VALIDATOR_DATA_DIR/db" ]
then
rm -r $VALIDATOR_DATA_DIR/db
fi

mkdir $PRYSM_DATA_DIR
mkdir $GETH_DATA_DIR

cp $CONFIG_DIR/genesis.json $CONFIG_DIR/generated-genesis.json
sed -i -e 's/XXX/'$SHANGHAI'/' $CONFIG_DIR/generated-genesis.json


##
# Setup Prysm
#

cd $PRYSM_DIR
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

cd $GETH_DIR
./build/bin/geth --datadir $GETH_DATA_DIR init $CONFIG_DIR/generated-genesis.json
./build/bin/geth account import --password $CONFIG_DIR/password.txt --datadir $GETH_DATA_DIR $CONFIG_DIR/privatekey.txt
cd ../
