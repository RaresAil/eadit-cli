import os from 'os';
import fs from 'fs';
import nodePath from 'path';
import { execSync } from 'child_process';

export default abstract class Utils {
  public static getUserDic(): string | undefined {
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
      return undefined;
    }

    let dir: string | undefined;
    try {
      dir = execSync(findCommand)
        .toString('utf8')
        .trim()
        .replace(/\r?\n|\r/g, '');
    } catch {
      return undefined;
    }

    if (!fs.existsSync(nodePath.normalize(dir))) {
      return undefined;
    }

    return dir;
  }

  public static getInstallerName(yarn: boolean): string {
    return yarn ? 'yarn' : 'npm';
  }

  public static getInstallCommand(
    packages: string[],
    dev: boolean,
    yarn: boolean
  ): string {
    let installCommand = `npm i ${dev ? '-D' : '--save'}`;

    if (yarn) {
      installCommand = `yarn add ${dev ? ' -D' : ''}`.trim();
    }

    return [installCommand, ...packages].join(' ');
  }

  public static getInstallAll(yarn: boolean): string {
    return yarn ? 'yarn install' : 'npm i';
  }

  public static log(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }

  public static logError(...args: any[]) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }

  public static copyDir(source: string, destination: string) {
    fs.mkdirSync(destination, {
      recursive: true
    });

    fs.readdirSync(source, { withFileTypes: true }).map((entry) => {
      const srcPath = nodePath.join(source, entry.name);
      const destPath = nodePath.join(destination, entry.name);

      return entry.isDirectory()
        ? Utils.copyDir(srcPath, destPath)
        : fs.copyFileSync(
            srcPath,
            destPath.replace('.txt', '.ts'),
            fs.constants.COPYFILE_FICLONE
          );
    });
  }
}
