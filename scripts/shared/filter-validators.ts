import { Validator } from './interfaces';

export const filterValidators = (validators: Validator[], withdrawalCredentials: string) => {
  return validators.filter((data) => {
    return data.validator.withdrawal_credentials === withdrawalCredentials;
  });
};
