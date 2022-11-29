import { providers } from 'ethers';

export const getProvider = (executionLayerURL: string) => {
  return new providers.JsonRpcProvider(executionLayerURL);
};
