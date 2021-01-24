#! /usr/bin/env node

import fs from 'fs';
import path from 'path';
import program from 'commander';
import colors from 'colors/safe';
import { execSync } from 'child_process';

import Config from './index';
import Utils from './functions/Utils';
import createConfigFile from './functions/createConfigFile';

program
  .version(Config.version)
  .description("CLI for 'adr-express-ts'")
  .option('--init', 'Creates a config file');

const rawCommands = fs.readdirSync(path.join(__dirname, 'commands'));
rawCommands.forEach((command) => {
  try {
    if (
      !command.toString().endsWith('.js') &&
      !command.toString().endsWith('.ts')
    ) {
      return;
    }

    require(path.join(__dirname, 'commands', command)).default();
  } catch {}
});

try {
  const latestVersion = execSync(`npm show ${Config.name} version`)
    .toString('utf8')
    .trim()
    .replace(/\r?\n|\r/g, '');

  if (latestVersion && Config && Config.version) {
    if (latestVersion !== Config.version) {
      Utils.log(
        '\n\n',
        colors.yellow('WARNING'),
        colors.gray(':'),
        colors.white('You are not using the latest version!'),
        `${colors.gray('(')}Last: ${colors.green(latestVersion)}`,
        `Current: ${colors.red(Config.version)}${colors.gray(')')}`,
        '\n\n'
      );
    }
  }
} catch {}

(() => {
  program.parseOptions(process.argv);

  if (program.init) {
    createConfigFile();
    return;
  }

  program.parse(process.argv);
})();
