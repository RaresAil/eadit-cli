import { exec } from 'child_process';
import { expect } from 'chai';
import Mocha from 'mocha';
import { EOL } from 'os';
import fs from 'fs';
import path from 'path';

import { execute, ENTER, SPACE } from '../utils/cmd';
import questions from '../utils/questions';

const clearProject = (done: Mocha.Done) => {
  const args = [
    path.join(process.cwd(), 'demo'),
    {
      recursive: true
    },
    () => {
      done();
    }
  ];
  if (require('fs')?.rm) {
    (fs.rm as any)(...args);
  } else {
    (fs.rmdir as any)(...args);
  }
};

describe('Create express project', () => {
  after(clearProject);
  afterEach(clearProject);

  it('Without any deps', async () => {
    const response = (
      (await execute(
        'bin/commands.js',
        ['create', 'demo'],
        {
          [questions.template]: ENTER,
          [questions.path]: `Y${ENTER}`,
          [questions.yarn]: `Y${ENTER}`,
          [questions.deps]: ENTER,
          [questions.clearDir]: `Y${ENTER}`
        },
        {
          env: {
            DEBUG: true
          }
        }
      )) as Promise<any>
    )
      .toString()
      .trim()
      .split(EOL)
      .pop();

    expect(response).to.contain('In the same folder with eaditconfig.json');

    await new Promise((resolve, reject) => {
      exec(
        `cd "${path.join(process.cwd(), 'demo')}" && yarn test`,
        (err, stdout) => {
          if (err) {
            return reject(err);
          }

          return resolve(stdout);
        }
      );
    });
  });

  it('With 1 dep', async () => {
    const response = (
      (await execute(
        'bin/commands.js',
        ['create', 'demo'],
        {
          [questions.template]: ENTER,
          [questions.path]: `Y${ENTER}`,
          [questions.yarn]: `Y${ENTER}`,
          [questions.deps]: `${SPACE}${ENTER}`,
          [questions.clearDir]: `Y${ENTER}`
        },
        {
          env: {
            DEBUG: true
          }
        }
      )) as Promise<any>
    )
      .toString()
      .trim()
      .split(EOL)
      .pop();

    expect(response).to.contain('In the same folder with eaditconfig.json');
    expect(
      require(path.join(process.cwd(), 'demo', 'package.json')).dependencies
    ).to.haveOwnProperty('morgan');

    await new Promise((resolve, reject) => {
      exec(
        `cd "${path.join(process.cwd(), 'demo')}" && yarn test`,
        (err, stdout) => {
          if (err) {
            return reject(err);
          }

          return resolve(stdout);
        }
      );
    });
  });
});
