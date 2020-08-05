#! /usr/bin/env node

import program from 'commander';
import fs from 'fs';
import path from 'path';
import Config from './index';
import colors from 'colors/safe';
import { execSync } from 'child_process';

program
  .version(Config.version)
  .description("CLI for 'express-adr-dependency-injection-typescript'");

const rawCommands = fs.readdirSync(path.join(__dirname, 'commands'));
rawCommands.forEach((command) => {
  try {
    if (!command.toString().endsWith('.js') || command.toString().endsWith('.ts')) {
      return;
    }

    (require(path.join(__dirname, 'commands', command)).default)();
  } catch { }
});

try {
  const latestVersion = execSync('npm show eadit-cli version').toString('utf8').trim().replace(/\r?\n|\r/g, '');
  if (latestVersion && Config.version) {
    if (latestVersion !== Config.version) {
      console.log('\n\n', colors.yellow('WARNING'), colors.gray(':'), colors.white('You are not using the latest version!'), `${colors.gray('(')}Last: ${colors.green(latestVersion)}`, `Current: ${colors.red(Config.version)}${colors.gray(')')}`, '\n\n');
    }
  }
} catch { }

program.parse(process.argv);
