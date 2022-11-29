import { providers, Wallet } from 'ethers';

export const getWallet = (privateKey: string, provider: providers.Provider) => {
  return new Wallet(privateKey, provider);
};
