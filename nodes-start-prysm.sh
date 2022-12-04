#!/bin/bash

source nodes-config.sh
cd $PRYSM_DIR

bazel run //cmd/beacon-chain -- \
	--contract-deployment-block=0 \
	--datadir=$PRYSM_DATA_DIR \
	--interop-eth1data-votes \
	--interop-genesis-state=$PRYSM_DATA_DIR/genesis.ssz \
	--min-sync-peers=0 \
	--force-clear-db \
	--enable-debug-rpc-endpoints \
	--genesis-state=$PRYSM_DATA_DIR/genesis.ssz \
	--bootstrap-node= \
	--chain-config-file=$CONFIG_DIR/config.yml \
	--config-file=$CONFIG_DIR/config.yml \
	--chain-id=32382 \
	--execution-endpoint=http://localhost:8551 \
	--accept-terms-of-use \
	--jwt-secret=$CONFIG_DIR/jwtsecret.txt \
	--suggested-fee-recipient=$FEE_RECIPIENT \
	--verbosity debug
