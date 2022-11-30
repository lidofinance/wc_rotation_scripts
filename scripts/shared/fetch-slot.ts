import { GetBlockV2Response } from './interfaces';
import fetch from 'node-fetch';

export const fetchSlotData = async (consensusLayerURL: string, stateId: string | number) => {
  const url = new URL(`eth/v2/beacon/blocks/${stateId}`, consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = (await response.json()) as GetBlockV2Response;

  return data;
};
