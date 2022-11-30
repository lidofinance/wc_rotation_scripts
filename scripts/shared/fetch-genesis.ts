import { GetGenesisResponse } from './interfaces';
import fetch from 'node-fetch';

export const fetchGenesis = async (consensusLayerURL: string) => {
  const url = new URL('eth/v1/beacon/genesis', consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = (await response.json()) as GetGenesisResponse;

  return data;
};
