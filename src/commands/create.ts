import fs from 'fs';
import nodePath from 'path';
import program from 'commander';
import colors from 'colors/safe';

import Config from '../index';
import Utils from '../functions/Utils';
import createApp from '../functions/createEADITApp';
import createFileByType from '../functions/createFileByType';

export default () => {
  program.command('create [path]').action((path: string) => {
    if (!Config.userDir || !fs.existsSync(nodePath.normalize(Config.userDir))) {
      Utils.log(colors.red('Unknown Current Path'), '\n');
      return;
    }

    if (!Utils.verifyConfigAndMigrate()) {
      if (!path || path.trim() === '') {
        Utils.log(colors.red('A path is required.'), '\n');
        return;
      }

      createApp(path, Config.templates[0]);
    } else {
      createFileByType();
    }
  });
};
