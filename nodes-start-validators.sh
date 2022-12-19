#!/bin/bash

source nodes-config.sh
cd $PRYSM_DIR

bazel run //cmd/validator -- \
	--wallet-dir=$VALIDATOR_DATA_DIR/wallet \
	--datadir=$VALIDATOR_DATA_DIR/db \
	--accept-terms-of-use \
	--chain-config-file=$CONFIG_DIR/config.yml \
	--config-file=$CONFIG_DIR/config.yml \
	--grpc-max-msg-size=104857600 \
	--wallet-password-file=$CONFIG_DIR/wallet-password.txt
