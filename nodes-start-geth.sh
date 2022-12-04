#!/bin/bash

source nodes-config.sh
cd $GETH_DIR

./build/bin/geth \
	--http \
	--http.api="engine,net,eth,web3,personal,debug,txpool" \
	--http.addr="0.0.0.0" \
	--http.vhosts="*" \
	--http.corsdomain="*" \
	--datadir=$GETH_DATA_DIR \
	--nodiscover \
	--syncmode=full \
	--allow-insecure-unlock \
	--authrpc.jwtsecret=$CONFIG_DIR/jwtsecret.txt \
	--mine \
	--miner.etherbase=$ACCOUNT_ADDRESS \
	--password=$CONFIG_DIR/password.txt \
	--unlock=$ACCOUNT_ADDRESS
