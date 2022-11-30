import { ValidatorData } from './interfaces';

export const filterValidators = (validators: ValidatorData[], withdrawalCredentials: string) => {
  return validators.filter((data) => {
    return data.validator.withdrawal_credentials === withdrawalCredentials;
  });
};
