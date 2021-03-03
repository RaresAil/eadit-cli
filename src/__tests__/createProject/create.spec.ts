import { expect } from 'chai';
import Mocha from 'mocha';
import { EOL } from 'os';
import { rmdir } from 'fs';
import path from 'path';

import { execute, ENTER } from '../utils/cmd';
import questions from '../utils/questions';

const clearProject = (done: Mocha.Done) => {
  rmdir(
    path.join(process.cwd(), 'demo'),
    {
      recursive: true
    },
    () => {
      done();
    }
  );
};

describe('Create express project', () => {
  after(clearProject);

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
