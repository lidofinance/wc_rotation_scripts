import { Validator } from './interfaces';
import fetch from 'node-fetch';

export const fetchValidators = async (consensusLayerURL: string, stateId: string | number) => {
  const url = new URL(`/eth/v1/beacon/states/${stateId}/validators`, consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = await response.json();

  return data as Validator[];
};
