/* eslint-disable no-console */
import fs from 'fs';
import { prompt } from 'inquirer';
import path from 'path';
import Config from '../index';
import colors from 'colors/safe';
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
      console.log(
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
      console.log(colors.red('A configuration file already exists.'));
      return;
    }

    const packagesFile: boolean = fs.existsSync(
      path.join(Config.userDir, 'package.json')
    );
    if (!packagesFile) {
      console.log(
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
      console.log(colors.red('Unknwon Template'));
      return;
    }

    fs.writeFileSync(
      path.join(Config.userDir, Config.configName),
      JSON.stringify(defaultConfig([module]), null, 2)
    );
  } catch {
    console.log(colors.red('Unknwon Error'));
  }
};
