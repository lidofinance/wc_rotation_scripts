import { Contract, providers, Signer } from 'ethers';

export const getDepositContract = async (address: string, signerOrProvider: providers.Provider | Signer) => {
  const minimalAbi = [
    'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
    'function deposit(bytes calldata pubkey, bytes calldata withdrawal_credentials, bytes calldata signature, bytes32 deposit_data_root) external payable',
  ];

  return new Contract(address, minimalAbi, signerOrProvider);
};
