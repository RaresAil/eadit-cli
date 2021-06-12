import { prompt } from 'inquirer';
import colors from 'colors/safe';
import nodePath from 'path';
import RE2 from 're2';
import fs from 'fs';

import Config from '../index';
import Utils from './Utils';

const execInDirSyncRecursive = (path: string, callback: any) => {
  fs.readdirSync(path).forEach((item: string) => {
    const itemPath = nodePath.join(path, item);
    const isDir = fs.lstatSync(itemPath).isDirectory();
    if (isDir) {
      callback(itemPath);
      execInDirSyncRecursive(itemPath, callback);
    }
  });
};

export default async () => {
  if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
    Utils.log(colors.bold(colors.red('Unknown Current Path')), '\n');
    return;
  }

  try {
    const selectedTemplate = Config.templates[0];
    const fileCreate = Config.fileCreate[selectedTemplate.toString()];
    const paths = Config.paths[selectedTemplate.toString()];
    const types = Object.keys(fileCreate);
    const { type } = await prompt([
      {
        type: 'list',
        name: 'type',
        message: 'What type of file do you want to create?',
        choices: types
      }
    ]);

    if (!type || !Object.keys(fileCreate).includes(type)) {
      Utils.logError(colors.bold(colors.red('Invalid type.')));
      return;
    }

    let pathToSave = nodePath.join(Config.userDir, paths[type.toString()]);
    if (!fs.existsSync(pathToSave)) {
      Utils.logError(
        `${colors.bold(colors.red('The path'))} %o`,
        paths[type.toString()],
        colors.bold(colors.red("doesn't exists!"))
      );
      return;
    }

    const { ask, file, suffix, recursiveDir } = fileCreate[type.toString()];
    if (!fs.existsSync(nodePath.join(Config.root, 'templates', file))) {
      Utils.logError(colors.bold(colors.red('No template was found :(')));
      return;
    }

    if (recursiveDir) {
      let directories: string[] = ['/'];
      execInDirSyncRecursive(pathToSave, (directory: string) => {
        directories = [...directories, directory.replace(pathToSave, '')];
      });

      const { selectedDirectory } = await prompt([
        {
          type: 'list',
          name: 'selectedDirectory',
          message:
            'Your actions directory has Subdirectories ("/" is the root)',
          choices: directories
        }
      ]);

      pathToSave = nodePath.join(pathToSave, selectedDirectory);
    }

    let templateFile = fs
      .readFileSync(nodePath.join(Config.root, 'templates', file))
      .toString('utf8');

    if (ask.length > 0) {
      const answers = (await prompt(
        ask.map((askItem) => {
          return {
            type: 'input',
            name: askItem.name,
            message: askItem.question
          };
        })
      )) as {
        [key: string]: string;
      };

      let nameToSave = `Generated${suffix}_${Date.now()}.ts`;

      Object.keys(answers).forEach((search) => {
        if (search === '__FILE_NAME__') {
          const givenName = answers[search.toString()]
            .replace(/\.ts/gi, '')
            .replace(/[^a-zA-Z0-9_]/gi, '');

          if (givenName && givenName.trim() !== '') {
            nameToSave = `${givenName}${suffix}.ts`;
          }
          return;
        }

        const place = answers[search.toString()].startsWith('/')
          ? answers[search.toString()].substr(1)
          : answers[search.toString()];
        templateFile = templateFile.replace(new RE2(search, 'g'), place);
      });

      if (fs.existsSync(nodePath.join(pathToSave, nameToSave))) {
        Utils.logError(
          `${colors.bold(colors.red('A file with the name'))} %o`,
          nameToSave,
          colors.bold(colors.red('already exists!'))
        );
        return;
      }

      try {
        fs.writeFileSync(nodePath.join(pathToSave, nameToSave), templateFile);
      } catch {
        Utils.logError(colors.bold(colors.red('Unable to save the file!')));
      }
    }
  } catch {
    Utils.logError(colors.bold(colors.red('Invalid configuration file.')));
  }
};
