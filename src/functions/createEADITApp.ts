import { execSync } from 'child_process';
import AsyncLock from 'async-lock';
import { prompt } from 'inquirer';
import colors from 'colors/safe';
import nodePath from 'path';
import RE2 from 're2';
import fs from 'fs';

import defaultConfig from '../config/default';
import Config from '../index';
import Utils from './Utils';

const lock = new AsyncLock();

export enum ReplaceType {
  IndexInjectMiddleware = '// __EADIT_CLI_PLACEHOLDER_INJECT_MIDDLEWARES',
  ServerBeforeStart = '// __EADIT_CLI_PLACEHOLDER_BEFORE_SERVER_START',
  ServerRetrieveVar = '// __EADIT_CLI_PLACEHOLDER_SERVER_RETRIVE',
  ServerImport = '// __EADIT_CLI_PLACEHOLDER_SERVER_IMPORTS',
  IndexInjectVar = '// __EADIT_CLI_PLACEHOLDER_INJECT_VARS',
  IndexImport = '// __EADIT_CLI_PLACEHOLDER_IMPORTS'
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
    Utils.log(colors.red('Unknown Path'), '\n');
    return;
  }

  if (
    !template ||
    !Config.templates.includes(template) ||
    !Config.githubLinks[template.toString()] ||
    !Config.githubLinks[template.toString()].endsWith('.git') ||
    !Config.modules[template.toString()]
  ) {
    Utils.log(colors.red('Unknown Template'), '\n');
    return;
  }

  const modulesData = Config.modules[template.toString()];
  const moduleQuestions: any[] = [
    {
      type: 'checkbox',
      name: 'modules',
      message: 'What other dependencies do you want?',
      choices: Object.keys(Config.modules[template.toString()])
    }
  ];

  if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
    Utils.log(colors.red('Unknown Current Path'), '\n');
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

  const yarnCheck = execSync('yarn -v')
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

    if (yarnCheck.match(/^\d.+\d+.\d+$/g)) {
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
    let requestDatabase = false;

    let promises: Promise<void>[] = [];

    const initModule = async (moduleName: string) => {
      if (!requestDatabase) {
        requestDatabase = !!modulesData[moduleName.toString()].databases;
      }

      if (modulesData[moduleName.toString()].replacements) {
        let replacementPromises: Promise<void>[] = [];

        const initReplacement = async (replacement: ReplacementOb) => {
          await lock.acquire('ask-replace', async (done) => {
            let oldData = replacements[replacement.type] ?? [];

            let replaceWith = replacement.with;

            if (replacement.ask) {
              const questionsToAsk = replacement.ask.map((rep) => {
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
                Object.keys(answers).forEach((answer) => {
                  replaceWith = replaceWith.replace(
                    new RE2(answer, 'g'),
                    answers[answer.toString()]
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

        modulesData[moduleName.toString()].replacements!.forEach(
          (replacement) => {
            replacementPromises = [
              ...replacementPromises,
              initReplacement(replacement)
            ];
          }
        );

        await Promise.all(replacementPromises);
      }

      modulesToInstall = [
        ...modulesToInstall,
        modulesData[moduleName.toString()].packageName
      ];

      if (modulesData[moduleName.toString()].devPackage) {
        devModulesToInstall = [
          ...devModulesToInstall,
          modulesData[moduleName.toString()].devPackage!
        ];
      }

      if (modulesData[moduleName.toString()].template) {
        templatesToInstall = [
          ...templatesToInstall,
          {
            name: modulesData[moduleName.toString()].template!,
            location: modulesData[moduleName.toString()].templateLocation,
            saveName: modulesData[moduleName.toString()].templateName
          }
        ];
      }
    };

    (modules as string[]).forEach((moduleName) => {
      promises = [...promises, initModule(moduleName)];
    });

    await Promise.all(promises);

    if (requestDatabase) {
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
          /CLI_SEQUELIZE_DIALECT_NAME/gm,
          modulesData['Sequelize ORM'].databases![dialect.toString()]
            .dialectName
        )
      );

      modulesToInstall = [
        ...modulesToInstall,
        modulesData['Sequelize ORM'].databases![dialect.toString()].packageName
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
    execSync(
      `git clone ${Config.githubLinks[template.toString()]} "${fullPath}"`
    );

    Config.deleteOnClone[template.toString()].map((item) => {
      const itemPath = nodePath.join(fullPath, item);
      if (!fs.existsSync(itemPath)) {
        return false;
      }

      const isDir = fs.lstatSync(itemPath).isDirectory();
      if (isDir) {
        fs.rmdirSync(itemPath, {
          recursive: true
        });
        return true;
      }

      fs.unlinkSync(itemPath);
      return true;
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

      templatesToInstall.forEach((template) => {
        const templatePath = nodePath.join(
          Config.root,
          'templates',
          template.name
        );
        const destination = nodePath.join(
          fullPath,
          ...(template.location || ['src', 'domain', 'entities'])
        );

        if (fs.existsSync(templatePath) && fs.existsSync(destination)) {
          fs.copyFileSync(
            templatePath,
            nodePath.join(
              destination,
              template.saveName
                ? `${template.saveName}.ts`
                : `${template.name.replace('.txt', '')}Model.ts`
            )
          );
        } else {
          Utils.logError(
            `Unable to install template "${template.name.replace('.txt', '')}"`
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
      const replaceWith = replacements[replacement.toString()].join('\n');
      const replaceRegex = new RE2(replacement, 'gi');

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
        case ReplaceType.ServerRetrieveVar:
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
      const replaceRegex = new RE2(
        Object.values(ReplaceType)[parseInt(index.toString())],
        'gi'
      );
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
        JSON.stringify(defaultConfig([template.toString()]), null, 2)
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
      Config.endMessage[template.toString()],
      '\n',
      `By using ${colors.cyan(`npx ${Config.name} create`)}`,
      '\n',
      `In the same folder with ${colors.cyan(`${Config.configName}`)}`
    );
  });
};
