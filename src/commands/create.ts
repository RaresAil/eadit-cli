import program from 'commander';
import { prompt } from 'inquirer';
import fs from 'fs';
import Config from '../index';
import colors from 'colors/safe';
import nodePath from 'path';

import createApp from '../functions/createEADITApp';
import createFileByType from '../functions/createFileByType';

export default () => {
  program.command('create [path]').action((path: string) => {
    if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
      console.log(colors.red('Unknwon Current Path'), '\n');
      return;
    }

    const hasConfigFile: boolean = fs.existsSync(
      nodePath.join(Config.userDir, Config.configName)
    );
    if (!hasConfigFile) {
      if (!path || path.trim() === '') {
        console.log(colors.red('A path is required.'), '\n');
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
