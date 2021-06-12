import fs from 'fs';
import path from 'path';

import Utils from './functions/Utils';
import { ModulesData } from './functions/createEADITApp';
import ExpressModuleConfig from './config/expressModule';

const root = __dirname;
let version: string = '0.0.0';
let name: string = '';
let dir: string | undefined;

export interface FileCreateType {
  [key: string]: {
    file: string;
    suffix: string;
    ask: {
      name: string;
      question: string;
    }[];
    recursiveDir?: boolean;
  };
}

interface CLIConfig {
  root: string;
  version: string;
  name: string;
  legacyConfigName: string;
  configKey: string;
  userDir?: string;
  templates: string[];

  deleteOnClone: {
    [key: string]: string[];
  };

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
  endMessage: {
    [key: string]: string;
  };
}

try {
  const packageData = fs
    .readFileSync(path.join(root, '..', 'package.json'))
    .toString('utf8');
  if (packageData && JSON.parse(packageData)) {
    const data = JSON.parse(packageData);
    version = data.version;
    name = data.name;
  }

  dir = Utils.getUserDic();
} catch {}

export default {
  root,
  version,
  name,
  legacyConfigName: 'eaditconfig.json',
  configKey: 'adr-express-ts',
  userDir: dir,

  templates: ['Express'],

  deleteOnClone: {
    Express: ['.git', 'yarn.lock', 'package-lock.json', '.github']
  },

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
  },

  endMessage: {
    Express: ExpressModuleConfig.endMessage
  }
} as CLIConfig;
