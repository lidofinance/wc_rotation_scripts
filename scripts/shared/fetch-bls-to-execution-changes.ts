import { GetPoolBLSToExecutionChangesResponse } from './interfaces';
import fetch from 'node-fetch';

export const fetchBLSToExecutionChanges = async (consensusLayerURL: string) => {
  const url = new URL('eth/v1/beacon/pool/bls_to_execution_changes', consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = (await response.json()) as GetPoolBLSToExecutionChangesResponse;

  return data;
};
