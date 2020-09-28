import fs from 'fs';
import path from 'path';
import colors from 'colors/safe';
import { prompt } from 'inquirer';

import Utils from './Utils';
import Config from '../index';
import defaultConfig from '../config/default';

const moduleQuestions: any[] = [
  {
    type: 'list',
    name: 'template',
    message: 'What type of template do you have?',
    choices: Config.templates
  }
];

export default async (): Promise<void> => {
  try {
    if (!Config || !Config.userDir) {
      Utils.log(
        colors.red(
          'You can only generate a config file in the same directory with packages.json'
        )
      );
      return;
    }

    const configFile: boolean = fs.existsSync(
      path.join(Config.userDir, Config.configName)
    );
    if (configFile) {
      Utils.log(colors.red('A configuration file already exists.'));
      return;
    }

    const packagesFile: boolean = fs.existsSync(
      path.join(Config.userDir, 'package.json')
    );
    if (!packagesFile) {
      Utils.log(
        colors.red(
          'You can only generate a config file in the same directory with package.json'
        )
      );
      return;
    }

    let module = Config.templates[0];

    if (Config.templates.length > 1) {
      const { template } = await prompt(moduleQuestions);
      module = template;
    }

    if (!module) {
      Utils.log(colors.red('Unknwon Template'));
      return;
    }

    fs.writeFileSync(
      path.join(Config.userDir, Config.configName),
      JSON.stringify(defaultConfig([module]), null, 2)
    );
  } catch {
    Utils.log(colors.red('Unknwon Error'));
  }
};
