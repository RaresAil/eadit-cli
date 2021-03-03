import spawn from 'cross-spawn';
import { existsSync } from 'fs';

import ProcessEnv from './@types/ProcessEnv';

export default (
  processPath: string,
  args: string[] = [],
  env: ProcessEnv = {}
) => {
  if (!processPath || !existsSync(processPath)) {
    throw new Error('Invalid process path');
  }

  args = [processPath].concat(args);

  return spawn('node', args, {
    env: {
      ...env,
      NODE_ENV: 'test',
      PATH: process.env.PATH
    },
    stdio: [null, null, null, 'ipc']
  });
};
