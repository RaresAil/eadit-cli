import fs from 'fs';
import path from 'path';
import Utils from './functions/Utils';
import ExpressModuleConfig from './config/expressModule';

import { ModulesData } from './functions/createEADITApp';

const root = __dirname;
let version: string = '0.0.0';
let name: string = '';
let dir: string | undefined;

interface CLIConfig {
  root: string;
  version: string;
  name: string;
  configName: string;
  userDir?: string;
  templates: string[];
  fileCreate: {
    [key: string]: FileCreateType;
  };
  paths: {
    [key: string]: {
      [key: string]: string;
    };
  };
  githubLinks: {
    [key: string]: string;
  };
  modules: {
    [key: string]: ModulesData;
  };
}

export interface FileCreateType {
  [key: string]: {
    file: string;
    suffix: string;
    ask: {
      name: string;
      question: string;
    }[];
  };
}

try {
  const packageData = fs.readFileSync(path.join(root, '..', 'package.json')).toString('utf8');
  if (packageData && JSON.parse(packageData)) {
    const data = JSON.parse(packageData);
    version = data.version;
    name = data.name;
  }

  dir = Utils.getUserDic();
} catch { }

export default {
  root,
  version,
  name,
  configName: 'eaditconfig.json',
  userDir: dir,

  templates: [
    'Express'
  ],

  modules: {
    Express: ExpressModuleConfig.modules
  },

  paths: {
    Express: ExpressModuleConfig.paths
  },

  fileCreate: {
    Express: ExpressModuleConfig.fileTypes
  },

  githubLinks: {
    Express: ExpressModuleConfig.github
  }
} as CLIConfig;
