import { execSync } from 'child_process';
import AsyncLock from 'async-lock';
import { prompt } from 'inquirer';
import colors from 'colors/safe';
import nodePath from 'path';
import RE2 from 're2';
import fs from 'fs';

import createConfigFile from './createConfigFile';
import Config from '../index';
import Utils from './Utils';

const lock = new AsyncLock();

export enum ReplaceType {
  IndexInjectMiddleware = '// __EADIT_CLI_PLACEHOLDER_INJECT_MIDDLEWARES',
  ServerBeforeStart = '// __EADIT_CLI_PLACEHOLDER_BEFORE_SERVER_START',
  ServerRetrieveVar = '// __EADIT_CLI_PLACEHOLDER_SERVER_RETRIEVE',
  ServerImport = '// __EADIT_CLI_PLACEHOLDER_SERVER_IMPORTS',
  IndexInjectVar = '// __EADIT_CLI_PLACEHOLDER_INJECT_VARS',
  IndexImport = '// __EADIT_CLI_PLACEHOLDER_IMPORTS'
}

export interface ReplacementsObject {
  [key: string]: string[];
}

export interface ReplacementOb {
  key?: string;
  type: ReplaceType;
  with: string;
  ask?: string[];
}

export interface ModuleData {
  packageName: string | string[];
  devPackage?: string | string[];
  template?: string | string[];
  templateName?: string;
  templateLocation?: string[];
  multipleTemplates?: {
    name?: string;
    template: string | string[];
    location: string[];
  }[];
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

    const { removeDemoCode }: { removeDemoCode: boolean } = await prompt([
      {
        type: 'confirm',
        name: 'removeDemoCode',
        message:
          'Do you want to remove the demo code? (Start with a clean project)',
        default: false
      }
    ]);

    const { modules } = await prompt(moduleQuestions);

    const modulesToInstall = new Set<string>();
    let replacements: ReplacementsObject = {};
    const globalReplacementKeys = new Set<string>();
    const devModulesToInstall = new Set<string>();
    let templatesToInstall: {
      name: string;
      saveName?: string;
      location?: string[];
    }[] = [];
    let requestDatabase = false;

    let promises: Promise<void>[] = [];

    const initModule = async (moduleName: string) => {
      const moduleData = modulesData[moduleName.toString()];
      if (!requestDatabase) {
        requestDatabase = !!moduleData.databases;
      }

      if (moduleData.replacements) {
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

        const replacementPromises: ReplacementOb[] =
          moduleData.replacements.reduce(
            (acc: ReplacementOb[], current: ReplacementOb) => {
              if (current.key && globalReplacementKeys.has(current.key)) {
                return acc;
              }

              if (current.key) {
                globalReplacementKeys.add(current.key);
              }

              return [...acc, current];
            },
            []
          );

        await Promise.all(
          replacementPromises.map((replacement) => initReplacement(replacement))
        );
      }

      if (Array.isArray(moduleData.packageName)) {
        moduleData.packageName.forEach((packageName) =>
          modulesToInstall.add(packageName)
        );
      } else {
        modulesToInstall.add(moduleData.packageName);
      }

      if (moduleData.devPackage) {
        if (Array.isArray(moduleData.devPackage)) {
          moduleData.devPackage.forEach((devPackage) =>
            devModulesToInstall.add(devPackage)
          );
        } else {
          devModulesToInstall.add(moduleData.devPackage);
        }
      }

      const templateToAdd = moduleData?.template;
      const extraTemplates = moduleData?.multipleTemplates;
      if (templateToAdd) {
        templatesToInstall = [
          ...templatesToInstall,
          {
            name: Array.isArray(templateToAdd)
              ? nodePath.join(...templateToAdd)
              : templateToAdd,
            location: moduleData.templateLocation,
            saveName: moduleData.templateName
          }
        ];
      }

      if (extraTemplates) {
        templatesToInstall = [
          ...templatesToInstall,
          ...extraTemplates.map(({ name, template, location }) => ({
            name: Array.isArray(template)
              ? nodePath.join(...template)
              : template,
            saveName: name,
            location
          }))
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

      modulesToInstall.add(
        modulesData['Sequelize ORM'].databases![dialect.toString()].packageName
      );
    }

    const npmInstallModules = Utils.getInstallCommand(
      Array.from(modulesToInstall),
      false,
      useYarn
    );

    const npmInstallDevModules = Utils.getInstallCommand(
      Array.from(devModulesToInstall),
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
        fs.rmSync(nodePath.join(filePath), {
          recursive: true
        });
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

      fs.rmSync(itemPath, {
        recursive: true
      });
      return true;
    });

    Utils.log(colors.green('Cloning complete.'), '\n');

    Utils.log(colors.yellow('Installing dependencies...'));
    execSync(`cd "${fullPath}" && ${Utils.getInstallAll(useYarn)}`);
    Utils.log(colors.green('Dependencies installed.'), '\n');

    if (modulesToInstall.size > 0) {
      Utils.log(
        colors.yellow(
          `Installing extra dependencies... (${modulesToInstall.size})`
        )
      );
      execSync(`cd "${fullPath}" && ${npmInstallModules}`);
      Utils.log(colors.green('Extra dependencies installed.'), '\n');
    }

    if (devModulesToInstall.size > 0) {
      Utils.log(
        colors.yellow(
          `Installing extra dev-dependencies... (${devModulesToInstall.size})`
        )
      );
      execSync(`cd "${fullPath}" && ${npmInstallDevModules}`);
      Utils.log(colors.green('Extra dev-dependencies installed.'), '\n');
    }

    if (templatesToInstall.length > 0) {
      Utils.log(
        colors.yellow(
          `Installing templates for extra dependencies... (${modulesToInstall.size})`
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

        let templateInstalled = false;

        try {
          const stat = fs.statSync(templatePath);

          if (stat.isDirectory()) {
            Utils.copyDir(templatePath, destination);
          } else {
            if (!fs.existsSync(destination)) {
              throw new Error('No destination!');
            }

            fs.copyFileSync(
              templatePath,
              nodePath.join(
                destination,
                template.saveName
                  ? `${template.saveName}.ts`
                  : `${nodePath
                      .basename(template.name)
                      .replace('.txt', '')}Model.ts`
              )
            );
            templateInstalled = true;
          }
        } finally {
          if (!templateInstalled) {
            Utils.logError(
              `Unable to install template "${nodePath
                .basename(template.name)
                .replace('.txt', '')}"`
            );
          }
        }
      });

      Utils.log(
        colors.green('Templates for extra dependencies installed.'),
        '\n'
      );
    }

    const indexTS = nodePath.join(fullPath, 'src', 'index.ts');
    const serverTS = nodePath.join(fullPath, 'src', 'app', 'Server.ts');

    const projectSrcRoot = nodePath.join(fullPath, 'src');

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

    if (removeDemoCode) {
      const templateFile: {
        demoFiles?: string[];
      } = JSON.parse(
        fs.readFileSync(nodePath.join(projectSrcRoot, '..', '.template.json'), {
          encoding: 'utf8'
        })
      ) ?? { demoFiles: [] };

      if ((templateFile?.demoFiles?.length ?? 0) > 0) {
        templateFile!.demoFiles!.map((subPath) => {
          const subPathParsed = nodePath.join(...subPath.split('/'));
          const absPath = nodePath.join(projectSrcRoot, subPathParsed);

          fs.rmSync(absPath, {
            recursive: true
          });
          return true;
        });
      }

      Utils.ReplaceAllInDir(
        projectSrcRoot,
        [
          new RE2(
            /(\/\/ __EADIT_CLI_PLACEHOLDER_DEMO_GROUP_START)[\s\S]*?(\/\/ __EADIT_CLI_PLACEHOLDER_DEMO_GROUP_END)/gm
          ),
          new RE2(/^.* \/\/ __EADIT_CLI_PLACEHOLDER_DEMO_LINE$/gm)
        ],
        ''
      );
    } else {
      Utils.ReplaceAllInDir(
        projectSrcRoot,
        [
          new RE2(/\/\/ __EADIT_CLI_PLACEHOLDER_DEMO_LINE/gm),
          new RE2(/\/\/ __EADIT_CLI_PLACEHOLDER_DEMO_GROUP_START/gm),
          new RE2(/\/\/ __EADIT_CLI_PLACEHOLDER_DEMO_GROUP_END/gm)
        ],
        ''
      );
    }

    createConfigFile(fullPath);

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
      `In the same folder with ${colors.cyan('package.json')}`
    );
  });
};
