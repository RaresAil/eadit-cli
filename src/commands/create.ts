import fs from 'fs';
import nodePath from 'path';
import program from 'commander';
import colors from 'colors/safe';
import { prompt } from 'inquirer';

import Config from '../index';
import Utils from '../functions/Utils';
import createApp from '../functions/createEADITApp';
import createFileByType from '../functions/createFileByType';

export default () => {
  program.command('create [path]').action((path: string) => {
    if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
      Utils.log(colors.red('Unknown Current Path'), '\n');
      return;
    }

    const hasConfigFile: boolean = fs.existsSync(
      nodePath.join(Config.userDir, Config.configName)
    );
    if (!hasConfigFile) {
      if (!path || path.trim() === '') {
        Utils.log(colors.red('A path is required.'), '\n');
        return;
      }

      prompt([
        {
          type: 'list',
          name: 'template',
          message: 'What template do you want?',
          choices: Config.templates
        }
      ]).then(({ template }) => {
        createApp(path, template);
      });
    } else {
      createFileByType();
    }
  });
};
