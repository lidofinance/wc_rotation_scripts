import { GetDepositContractResponse } from './interfaces';
import fetch from 'node-fetch';

export const fetchDepositContract = async (consensusLayerURL: string) => {
  const url = new URL('eth/v1/config/deposit_contract', consensusLayerURL);

  const response = await fetch(url.toString());
  const { data } = (await response.json()) as GetDepositContractResponse;

  return data;
};
