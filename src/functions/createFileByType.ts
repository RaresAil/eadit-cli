/* eslint-disable no-console */
import { prompt } from 'inquirer';
import fs from 'fs';
import Config from '../index';
import colors from 'colors/safe';
import nodePath from 'path';

import { EADITConfig } from '../config/default';

export default async () => {
  if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
    console.log(colors.bold(colors.red('Unknwon Current Path')), '\n');
    return;
  }

  const configFile = fs
    .readFileSync(nodePath.join(Config.userDir, Config.configName))
    .toString('utf8');
  try {
    const configData = JSON.parse(configFile) as EADITConfig;
    if (!configData || !configData.templates) {
      console.error(colors.bold(colors.red('Invalid configuration file.')));
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
      console.error(colors.bold(colors.red('Invalid tempalte.')));
      return;
    }

    const types = Object.keys(Config.fileCreate[selectedTemplate]);
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
      !Object.keys(Config.fileCreate[selectedTemplate]).includes(type)
    ) {
      console.error(colors.bold(colors.red('Invalid type.')));
      return;
    }

    const pathToSave = nodePath.join(
      Config.userDir,
      configData.paths[selectedTemplate][type]
    );
    if (!fs.existsSync(pathToSave)) {
      console.error(
        `${colors.bold(colors.red('The path'))} %o`,
        configData.paths[selectedTemplate][type],
        colors.bold(colors.red("dosen't exists!"))
      );
      return;
    }

    const { ask, file, suffix } = Config.fileCreate[selectedTemplate][type];
    if (!fs.existsSync(nodePath.join(Config.root, 'templates', file))) {
      console.error(colors.bold(colors.red('No template was found :(')));
      return;
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
          const givenName = answers[search]
            .replace(new RegExp('.ts', 'gi'), '')
            .replace(/[^a-zA-Z0-9_]/gi, '');

          if (givenName && givenName.trim() !== '') {
            nameToSave = `${givenName}${suffix}.ts`;
          }
          return;
        }

        const place = answers[search].startsWith('/')
          ? answers[search].substr(1)
          : answers[search];
        templateFile = templateFile.replace(new RegExp(search, 'g'), place);
      });

      if (fs.existsSync(nodePath.join(pathToSave, nameToSave))) {
        console.error(
          `${colors.bold(colors.red('A file with the name'))} %o`,
          nameToSave,
          colors.bold(colors.red('already exists!'))
        );
        return;
      }

      try {
        fs.writeFileSync(nodePath.join(pathToSave, nameToSave), templateFile);
      } catch {
        console.error(colors.bold(colors.red('Unable to save the file!')));
      }
    }
  } catch {
    console.error(colors.bold(colors.red('Invalid configuration file.')));
  }
};
