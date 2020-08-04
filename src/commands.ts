#! /usr/bin/env node

import program from 'commander';
import fs from 'fs';
import path from 'path';

program
  .version('1.0.0')
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

program.parse(process.argv);
