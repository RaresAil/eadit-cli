import fs from 'fs';
import path from 'path';
import colors from 'colors/safe';

import Utils from './Utils';
import Config from '../index';

export default (fullPath?: string): boolean => {
  try {
    const projectPath = fullPath ?? Config?.userDir;
    if (!projectPath) {
      throw new Error('NOT_FOUND');
    }

    const packagePath = path.join(projectPath, 'package.json');
    const packageJson: boolean = fs.existsSync(packagePath);

    if (!packageJson) {
      throw new Error('NOT_FOUND');
    }

    const legacyConfigPath = path.join(projectPath, Config.legacyConfigName);
    const configFile: boolean = fs.existsSync(legacyConfigPath);
    if (configFile) {
      Utils.log(
        colors.yellow(
          'A legacy configuration file was found. (It will be deleted)'
        )
      );
      fs.unlinkSync(legacyConfigPath);
    }

    const contents = JSON.parse(fs.readFileSync(packagePath).toString('utf8'));
    contents[Config.configKey] = true;
    fs.writeFileSync(packagePath, JSON.stringify(contents, null, 2));

    Utils.log(colors.green('Configuration set!'));
    return true;
  } catch (error) {
    switch (error.message) {
      case 'NOT_FOUND':
        Utils.log(
          colors.red(
            'You can only generate a config file in the same directory with package.json'
          )
        );
        return false;
    }

    Utils.log(colors.red('Unknown Error'));
    return false;
  }
};
