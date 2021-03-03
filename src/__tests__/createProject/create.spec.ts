import { rm } from 'fs/promises';
import { expect } from 'chai';
import { EOL } from 'os';
import path from 'path';

import { execute, ENTER } from '../utils/cmd';
import questions from '../utils/questions';

const clearProject = async () => {
  try {
    await rm(path.join(process.cwd(), 'demo'), {
      recursive: true
    });
  } catch {}
};

describe('Create express project', () => {
  after(async () => await clearProject());

  it('Wihtout any deps', async () => {
    const response = ((await execute(
      'bin/commands.js',
      ['create', 'demo'],
      {
        [questions.template]: ENTER,
        [questions.path]: `Y ${ENTER}`,
        [questions.yarn]: `Y ${ENTER}`,
        [questions.deps]: ENTER,
        [questions.clearDir]: `Y ${ENTER}`
      },
      {
        env: {
          DEBUG: true
        }
      }
    )) as Promise<any>)
      .toString()
      .trim()
      .split(EOL)
      .pop();

    expect(response).to.contain('In the same folder with eaditconfig.json');
  });
});
