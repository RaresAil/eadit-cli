import program from 'commander';
import { CheckboxQuestion, prompt } from 'inquirer';
import os from 'os';
import { execSync } from 'child_process';
import nodePath from 'path';
import fs from 'fs';

const gitUrl = 'https://github.com/RaresAil/express-adr-dependency-injection-typescript-example.git';

interface ModuleData {
  packageName: string;
  databases?: {
    [key: string]: {
      packageName: string;
    };
  };
}

interface ModulesData {
  [key: string]: ModuleData;
}

const modulesData: ModulesData = {
  Mongoose: {
    packageName: 'mongoose'
  },
  'Sequelize ORM': {
    packageName: 'sequelize',
    databases: {
      Postgres: {
        packageName: 'pg pg-hstore'
      },
      'Maria DB': {
        packageName: 'mariadb'
      },
      'MySQL 2': {
        packageName: 'mysql2'
      },
      'SQLite 3': {
        packageName: 'sqlite3'
      },
      'Microsoft SQL Server ': {
        packageName: 'tedious'
      }
    }
  },
  'JSON Web Token (jsonwebtoken)': {
    packageName: 'jsonwebtoken'
  }
};

const moduleQuestions: CheckboxQuestion[] = [
  {
    type: 'checkbox',
    name: 'modules',
    message: 'What other dependencies do you want?',
    choices: Object.keys(modulesData)
  }
];

const sequelizeDatabase: CheckboxQuestion[] = [
  {
    type: 'checkbox',
    name: 'dialects',
    message: 'What other dialects for Sequelize do you want?',
    choices: Object.keys(modulesData['Sequelize ORM'].databases ?? {})
  }
];

export default () => {
  program
    .command('create <path>')
    .action((path: string) => {
      let findCommand;
      const platform = os.platform();
      const linuxPlatforms = [
        'darwin',
        'linux',
        'freebsd',
        'openbsd',
        'sunos',
        'aix'
      ];

      if (linuxPlatforms.includes(platform)) {
        findCommand = 'pwd';
      } else if (platform === 'win32') {
        findCommand = 'cd';
      } else {
        console.log('Unknwon OS');
        return;
      }

      let dir: string | undefined;
      try {
        dir = execSync(findCommand).toString('utf8').trim().replace(/\r?\n|\r/g, '');
      } catch {
        console.log('Unknwon OS');
        return;
      }

      if (!fs.existsSync(nodePath.normalize(dir))) {
        console.log('Unknwon Current Path');
        return;
      }

      const gitCheck = execSync('git --version').toString('utf8').trim().replace(/\r?\n|\r/g, '');
      if (!gitCheck) {
        console.log('Git is not installed!');
        return;
      }

      const [gName, gVName, gVersion] = gitCheck.split(' ');
      if (!gName || !gVName || !gVersion || Number.isNaN(parseInt(gVersion.replace('.', '')))) {
        console.log('Git is not installed!');
        return;
      }

      const fullPath = nodePath.join(dir, path);

      prompt([
        {
          type: 'confirm',
          name: 'correct',
          message: `Is the path correct? ('${fullPath}')`,
          default: true
        }
      ]).then(async ({ correct }: { correct: boolean; }) => {
        if (!correct) {
          return;
        }

        const { modules } = await prompt(moduleQuestions);

        let modulesToInstall: string[] = [];
        let requestDatabse = false;
        (modules as string[]).forEach((moduleName) => {
          if (!requestDatabse) {
            requestDatabse = !!modulesData[moduleName].databases;
          }

          modulesToInstall = [
            ...modulesToInstall,
            modulesData[moduleName].packageName
          ];
        });

        if (requestDatabse) {
          const { dialects } = await prompt(sequelizeDatabase);
          (dialects as string[]).forEach((dialectName) => {
            modulesToInstall = [
              ...modulesToInstall,
              modulesData['Sequelize ORM'].databases![dialectName].packageName
            ];
          });
        }

        const npmInstallModules = [
          'npm i --save',
          ...modulesToInstall
        ].join(' ');

        fs.mkdirSync(fullPath, {
          recursive: true
        });

        const filesInDir = fs.readdirSync(fullPath);
        if (filesInDir.length > 0) {
          const { clearDir } = await prompt([
            {
              type: 'confirm',
              name: 'clearDir',
              message: 'The current directory is not empty, do you want to clear it?',
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

        console.log('Cloning template...');
        execSync(`git clone ${gitUrl} "${fullPath}"`);
        fs.rmdirSync(nodePath.join(fullPath, '.git'), {
          recursive: true
        });
        console.log('Cloning complete.');

        console.log('Installing dependencies...');
        execSync(`cd ${fullPath}`);
        execSync('npm i');
        console.log('Dependencies installed.');

        if (modulesToInstall.length > 0) {
          console.log(`Installing extra dependencies... (${modulesToInstall.length})`);
          execSync(npmInstallModules);
          console.log('Extra dependencies installed.');
        }

        console.log('Done.');
      });
    });
};
