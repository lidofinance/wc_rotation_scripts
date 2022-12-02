import { readFileSync } from 'fs';

export const readRotationMessagesFile = (filePath: string) => {
  return JSON.parse(readFileSync(filePath, 'utf8'));
};
