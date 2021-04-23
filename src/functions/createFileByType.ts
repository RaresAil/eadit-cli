import { prompt } from 'inquirer';
import colors from 'colors/safe';
import nodePath from 'path';
import fs from 'fs';

import { EADITConfig } from '../config/default';
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
    Utils.log(colors.bold(colors.red('Unknwon Current Path')), '\n');
    return;
  }

  const configFile = fs
    .readFileSync(nodePath.join(Config.userDir, Config.configName))
    .toString('utf8');
  try {
    const configData = JSON.parse(configFile) as EADITConfig;
    if (!configData || !configData.templates) {
      Utils.logError(colors.bold(colors.red('Invalid configuration file.')));
      return;
    }

    let selectedTemplate = configData.templates[0];
    if (configData.templates.length > 1) {
      selectedTemplate = await prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Your app use multiple templates, choose one.',
          choices: Config.templates
        }
      ]);
    }

    if (!selectedTemplate || !configData.templates.includes(selectedTemplate)) {
      Utils.logError(colors.bold(colors.red('Invalid tempalte.')));
      return;
    }

    const types = Object.keys(Config.fileCreate[selectedTemplate.toString()]);
    const { type } = await prompt([
      {
        type: 'list',
        name: 'type',
        message: 'What type of file do you want to create?',
        choices: types
      }
    ]);

    if (
      !type ||
      !Object.keys(Config.fileCreate[selectedTemplate.toString()]).includes(
        type
      )
    ) {
      Utils.logError(colors.bold(colors.red('Invalid type.')));
      return;
    }

    let pathToSave = nodePath.join(
      Config.userDir,
      configData.paths[selectedTemplate.toString()][type.toString()]
    );
    if (!fs.existsSync(pathToSave)) {
      Utils.logError(
        `${colors.bold(colors.red('The path'))} %o`,
        configData.paths[selectedTemplate.toString()][type.toString()],
        colors.bold(colors.red("dosen't exists!"))
      );
      return;
    }

    const { ask, file, suffix, recursiveDir } = Config.fileCreate[
      selectedTemplate.toString()
    ][type.toString()];
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
        templateFile = templateFile.replace(new RegExp(search, 'g'), place);
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
