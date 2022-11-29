import { readFileSync } from 'fs';

export const readValidatorsIndexesFile = (filePath: string) => {
  const fileContent = readFileSync(filePath, 'utf8').toString().trimEnd();

  return fileContent.split('\n').map((line) => {
    const validatorIndex = Number(line);

    if (Number.isNaN(validatorIndex)) {
      throw new Error('Validator index is not a number');
    }

    return validatorIndex;
  });
};
