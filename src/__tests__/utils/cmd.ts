/* eslint-disable no-console */
import RE2 from 're2';
import { constants } from 'os';
import concat from 'concat-stream';

import Inputs from './@types/Inputs';
import createProcess from './createProcess';
import ExecuteOptions from './@types/ExecuteOptions';

export const SPACE = '\x20';
export const ENTER = '\x0D';
export const UP = '\x1B\x5B\x41';
export const DOWN = '\x1B\x5B\x42';

export const execute = (
  path: string,
  args: string[] = [],
  inputs: Inputs = {},
  options: ExecuteOptions = {}
) => {
  let respondedInputs: string[] = [];
  const { env = {}, maxTimeout = 60000 } = options;

  const process = createProcess(path, args, env);
  process.stdin?.setDefaultEncoding('utf-8');

  type Timeout = globalThis.NodeJS.Timeout;
  let killIOTimeout: Timeout;

  const promise = new Promise((resolve, reject) => {
    process.stderr?.on('data', (err) => {
      if (env?.DEBUG) {
        console.log('error: %o', err.toString());
      }
    });

    process.stdout?.on('data', (data) => {
      let line: string = data.toString();
      respondedInputs.map((inp) => {
        line = line.replace(new RE2(inp, 'g'), '');
        return null;
      });

      const answer = Object.keys(inputs).find((inp) => line.includes(inp));

      if (killIOTimeout) {
        clearTimeout(killIOTimeout);
      }

      if (answer) {
        const respondWith = inputs[answer.toString()];
        process.stdin?.write(respondWith);
        respondedInputs = [...respondedInputs, answer];

        if (env?.DEBUG) {
          console.log('input: %o', respondWith);
        }
      }

      if (respondedInputs.length === Object.keys(inputs).length) {
        process.stdin?.end();
        killIOTimeout = setTimeout(() => {
          console.error('Error: Reached I/O timeout');
          process.kill(constants.signals.SIGTERM);
        }, maxTimeout);
        return;
      }

      if (env?.DEBUG) {
        console.log('output: %o', data.toString());
      }
    });

    process.on('error', (err) => {
      reject(err);
    });

    process.stdout?.pipe(
      concat((result) => {
        if (killIOTimeout) {
          clearTimeout(killIOTimeout);
        }

        resolve(result.toString());
      })
    );
  });

  return promise;
};
