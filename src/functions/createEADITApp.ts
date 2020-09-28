import fs from 'fs';
import nodePath from 'path';
import colors from 'colors/safe';
import { prompt } from 'inquirer';
import AsyncLock from 'async-lock';
import { execSync } from 'child_process';

import Utils from './Utils';
import Config from '../index';
import defaultConfig from '../config/default';

const lock = new AsyncLock();

export enum ReplaceType {
  IndexImport = '// __EADIT_CLI_PLACEHOLDER_IMPORTS',
  IndexInjectVar = '// __EADIT_CLI_PLACEHOLDER_INJECT_VARS',
  IndexInjectMiddleware = '// __EADIT_CLI_PLACEHOLDER_INJECT_MIDDLEWARES',
  ServerBeforeStart = '// __EADIT_CLI_PLACEHOLDER_BEFORE_SERVER_START',
  ServerRetriveVar = '// __EADIT_CLI_PLACEHOLDER_SERVER_RETRIVE',
  ServerImport = '// __EADIT_CLI_PLACEHOLDER_SERVER_IMPORTS'
}

export interface ReplacementsObject {
  [key: string]: string[];
}

export interface ReplacementOb {
  type: ReplaceType;
  with: string;
  ask?: string[];
}

export interface ModuleData {
  packageName: string;
  devPackage?: string;
  template?: string;
  templateName?: string;
  templateLocation?: string[];
  replacements?: ReplacementOb[];
  databases?: {
    [key: string]: {
      packageName: string;
      dialectName: string;
    };
  };
}

export interface ModulesData {
  [key: string]: ModuleData;
}

export default (path: string, template: string) => {
  if (!path || path.toString().trim() === '') {
    Utils.log(colors.red('Unknwon Path'), '\n');
    return;
  }

  if (
    !template ||
    !Config.templates.includes(template) ||
    !Config.githubLinks[template] ||
    !Config.githubLinks[template].endsWith('.git') ||
    !Config.modules[template]
  ) {
    Utils.log(colors.red('Unknwon Template'), '\n');
    return;
  }

  const modulesData = Config.modules[template];
  const moduleQuestions: any[] = [
    {
      type: 'checkbox',
      name: 'modules',
      message: 'What other dependencies do you want?',
      choices: Object.keys(Config.modules[template])
    }
  ];

  if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
    Utils.log(colors.red('Unknwon Current Path'), '\n');
    return;
  }

  const gitCheck = execSync('git --version')
    .toString('utf8')
    .trim()
    .replace(/\r?\n|\r/g, '');
  if (!gitCheck) {
    Utils.log(colors.red('Git is not installed!'), '\n');
    return;
  }

  const [gName, gVName, gVersion] = gitCheck.split(' ');
  if (
    !gName ||
    !gVName ||
    !gVersion ||
    Number.isNaN(parseInt(gVersion.replace('.', '')))
  ) {
    Utils.log(colors.red('Git is not installed!'), '\n');
    return;
  }

  let fullPath = nodePath.join(Config.userDir, path);
  if (nodePath.isAbsolute(path)) {
    fullPath = nodePath.join(path);
  }

  const yarnCheck = execSync('yarn info')
    .toString('utf8')
    .trim()
    .replace(/\r?\n|\r/g, '');
  let useYarn = false;

  prompt([
    {
      type: 'confirm',
      name: 'correct',
      message: `Is the path correct? ('${fullPath}')`,
      default: true
    }
  ]).then(async ({ correct }: { correct: boolean }) => {
    if (!correct) {
      return;
    }

    if (yarnCheck.startsWith('yarn info v')) {
      const { uYarn }: { uYarn: boolean } = await prompt([
        {
          type: 'confirm',
          name: 'uYarn',
          message: 'Yarn was detected on your system, do you want to use Yarn?',
          default: true
        }
      ]);

      useYarn = uYarn;
    }

    const { modules } = await prompt(moduleQuestions);

    let modulesToInstall: string[] = [];
    let replacements: ReplacementsObject = {};
    let devModulesToInstall: string[] = [];
    let templatesToInstall: {
      name: string;
      saveName?: string;
      location?: string[];
    }[] = [];
    let requestDatabse = false;

    let promises: Promise<void>[] = [];

    const initModule = async (moduleName: string) => {
      if (!requestDatabse) {
        requestDatabse = !!modulesData[moduleName].databases;
      }

      if (modulesData[moduleName].replacements) {
        let replacementPromises: Promise<void>[] = [];

        const initReplacement = async (replacement: ReplacementOb) => {
          await lock.acquire('ask-replace', async (done) => {
            let oldData = replacements[replacement.type] ?? [];

            let replaceWith = replacement.with;

            if (replacement.ask) {
              const questionsToAsk = replacement.ask!.map((rep) => {
                return {
                  type: 'input',
                  name: rep,
                  message: `For ${moduleName}, please give a value for: ${colors.green(
                    `${rep}`
                  )}`
                };
              });

              const answers = await prompt(questionsToAsk);

              if (answers) {
                Object.keys(answers).forEach((answ) => {
                  replaceWith = replaceWith.replace(
                    new RegExp(answ, 'g'),
                    answers[answ]
                  );
                });
              }
            }

            oldData = [...(oldData ?? []), replaceWith];

            replacements = {
              ...replacements,
              [replacement.type]: oldData
            };

            done();
          });
        };

        modulesData[moduleName].replacements!.forEach((replacement) => {
          replacementPromises = [
            ...replacementPromises,
            initReplacement(replacement)
          ];
        });

        await Promise.all(replacementPromises);
      }

      modulesToInstall = [
        ...modulesToInstall,
        modulesData[moduleName].packageName
      ];

      if (modulesData[moduleName].devPackage) {
        devModulesToInstall = [
          ...devModulesToInstall,
          modulesData[moduleName].devPackage!
        ];
      }

      if (modulesData[moduleName].template) {
        templatesToInstall = [
          ...templatesToInstall,
          {
            name: modulesData[moduleName].template!,
            location: modulesData[moduleName].templateLocation,
            saveName: modulesData[moduleName].templateName
          }
        ];
      }
    };

    (modules as string[]).forEach((moduleName) => {
      promises = [...promises, initModule(moduleName)];
    });

    await Promise.all(promises);

    if (requestDatabse) {
      const sequelizeDatabase: any[] = [
        {
          type: 'list',
          name: 'dialect',
          message: 'What dialect do you want for Sequelize?',
          choices: Object.keys(modulesData['Sequelize ORM'].databases ?? {})
        }
      ];

      const { dialect } = await prompt(sequelizeDatabase);
      replacements = JSON.parse(
        JSON.stringify(replacements).replace(
          new RegExp('CLI_SEQUELIZE_DIALECT_NAME', 'g'),
          modulesData['Sequelize ORM'].databases![dialect].dialectName
        )
      );

      modulesToInstall = [
        ...modulesToInstall,
        modulesData['Sequelize ORM'].databases![dialect].packageName
      ];
    }

    const npmInstallModules = Utils.getInstallCommand(
      modulesToInstall,
      false,
      useYarn
    );

    const npmInstallDevModules = Utils.getInstallCommand(
      devModulesToInstall,
      true,
      useYarn
    );

    fs.mkdirSync(fullPath, {
      recursive: true
    });

    const filesInDir = fs.readdirSync(fullPath);
    if (filesInDir.length > 0) {
      const { clearDir } = await prompt([
        {
          type: 'confirm',
          name: 'clearDir',
          message:
            'The current directory is not empty, do you want to clear it?',
          default: false
        }
      ]);

      if (!clearDir) {
        return;
      }

      filesInDir.forEach((file) => {
        const filePath = nodePath.join(fullPath, file);

        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmdirSync(nodePath.join(filePath), {
            recursive: true
          });
        } else {
          fs.unlinkSync(filePath);
        }
      });
    }

    Utils.log(colors.yellow('Cloning template...'));
    execSync(`git clone ${Config.githubLinks[template]} "${fullPath}"`);
    fs.rmdirSync(nodePath.join(fullPath, '.git'), {
      recursive: true
    });
    Utils.log(colors.green('Cloning complete.'), '\n');

    Utils.log(colors.yellow('Installing dependencies...'));
    execSync(`cd "${fullPath}" && ${Utils.getInstallAll(useYarn)}`);
    Utils.log(colors.green('Dependencies installed.'), '\n');

    if (modulesToInstall.length > 0) {
      Utils.log(
        colors.yellow(
          `Installing extra dependencies... (${modulesToInstall.length})`
        )
      );
      execSync(`cd "${fullPath}" && ${npmInstallModules}`);
      Utils.log(colors.green('Extra dependencies installed.'), '\n');
    }

    if (devModulesToInstall.length > 0) {
      Utils.log(
        colors.yellow(
          `Installing extra dev-dependencies... (${devModulesToInstall.length})`
        )
      );
      execSync(`cd "${fullPath}" && ${npmInstallDevModules}`);
      Utils.log(colors.green('Extra dev-dependencies installed.'), '\n');
    }

    if (templatesToInstall.length > 0) {
      Utils.log(
        colors.yellow(
          `Installing templates for extra dependencies... (${modulesToInstall.length})`
        )
      );

      templatesToInstall.forEach((tempalte) => {
        const templatePath = nodePath.join(
          Config.root,
          'templates',
          tempalte.name
        );
        const destination = nodePath.join(
          fullPath,
          ...(tempalte.location || ['src', 'domain', 'entities'])
        );

        if (fs.existsSync(templatePath) && fs.existsSync(destination)) {
          fs.copyFileSync(
            templatePath,
            nodePath.join(
              destination,
              tempalte.saveName
                ? `${tempalte.saveName}.ts`
                : `${tempalte.name.replace('.txt', '')}Model.ts`
            )
          );
        } else {
          Utils.logError(
            `Unable to install template "${tempalte.name.replace('.txt', '')}"`
          );
        }
      });
      Utils.log(
        colors.green('Templates for extra dependencies installed.'),
        '\n'
      );
    }

    const indexTS = nodePath.join(fullPath, 'src', 'index.ts');
    const serverTS = nodePath.join(fullPath, 'src', 'app', 'Server.ts');

    let indexContents = '';
    let serverContents = '';

    if (fs.existsSync(indexTS)) {
      indexContents = fs.readFileSync(indexTS, 'utf8');
    }

    if (fs.existsSync(serverTS)) {
      serverContents = fs.readFileSync(serverTS, 'utf8');
    }

    if (Object.keys(replacements).length > 0) {
      Utils.log(
        colors.yellow(
          `Injecting templates for extra dependencies... (${
            Object.keys(replacements).length
          })`
        )
      );
    }

    Object.keys(replacements).forEach((replacement) => {
      const replaceWith = replacements[replacement].join('\n');
      const replaceRegex = new RegExp(replacement, 'gi');

      switch (replacement) {
        case ReplaceType.IndexInjectMiddleware:
          indexContents = indexContents.replace(replaceRegex, replaceWith);
          break;
        case ReplaceType.IndexImport:
          indexContents = indexContents.replace(replaceRegex, replaceWith);
          break;
        case ReplaceType.IndexInjectVar:
          indexContents = indexContents.replace(replaceRegex, replaceWith);
          break;
        case ReplaceType.ServerRetriveVar:
          serverContents = serverContents.replace(replaceRegex, replaceWith);
          break;
        case ReplaceType.ServerBeforeStart:
          serverContents = serverContents.replace(replaceRegex, replaceWith);
          break;
        case ReplaceType.ServerImport:
          serverContents = serverContents.replace(replaceRegex, replaceWith);
          break;
      }
    });

    Object.keys(ReplaceType).forEach((type, index) => {
      const replaceRegex = new RegExp(Object.values(ReplaceType)[index], 'gi');
      indexContents = indexContents.replace(replaceRegex, '');
      serverContents = serverContents.replace(replaceRegex, '');
    });

    if (fs.existsSync(indexTS)) {
      fs.writeFileSync(indexTS, indexContents);
    }

    if (fs.existsSync(serverTS)) {
      fs.writeFileSync(serverTS, serverContents);
    }

    if (Object.keys(replacements).length > 0) {
      Utils.log(
        colors.green('Templates for extra dependencies injected.'),
        '\n'
      );
    }

    try {
      fs.writeFileSync(
        nodePath.join(fullPath, Config.configName),
        JSON.stringify(defaultConfig([template]), null, 2)
      );
    } catch {
      Utils.logError(
        colors.red('Unable to generate config file.'),
        '\n',
        'Use',
        colors.cyan(`npx ${Config.name} --init`),
        '\n'
      );
    }

    Utils.log(
      colors.green('Complete!'),
      '\n',
      'Use',
      colors.cyan(`${Utils.getInstallerName(useYarn)} run dev`),
      'to test the application',
      '\n',
      'Use',
      colors.cyan(`${Utils.getInstallerName(useYarn)} run build`),
      'to compile the application',
      '\n',
      'Use',
      colors.cyan(`${Utils.getInstallerName(useYarn)} run start`),
      'to run the compiled application',
      '\n\n',
      Config.endMessage[template],
      '\n',
      `By using ${colors.cyan(`npx ${Config.name} create`)}`,
      '\n',
      `In the same folder with ${colors.cyan(`${Config.configName}`)}`
    );
  });
};
