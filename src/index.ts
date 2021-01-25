import fs from 'fs';
import path from 'path';

import Utils from './functions/Utils';
import { ModulesData } from './functions/createEADITApp';
import ExpressModuleConfig from './config/expressModule';
import DiscordModuleConfig from './config/discordModule';

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
  configName: string;
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
  configName: 'eaditconfig.json',
  userDir: dir,

  templates: ['Express', 'Discord.js'],

  deleteOnClone: {
    Express: ['.git', 'yarn.lock', 'package-lock.json', '.github'],
    'Discord.js': ['.git', 'yarn.lock', 'package-lock.json', '.github']
  },

  modules: {
    Express: ExpressModuleConfig.modules,
    'Discord.js': DiscordModuleConfig.modules
  },

  paths: {
    Express: ExpressModuleConfig.paths,
    'Discord.js': DiscordModuleConfig.paths
  },

  fileCreate: {
    Express: ExpressModuleConfig.fileTypes,
    'Discord.js': DiscordModuleConfig.fileTypes
  },

  githubLinks: {
    Express: ExpressModuleConfig.github,
    'Discord.js': DiscordModuleConfig.github
  },

  endMessage: {
    Express: ExpressModuleConfig.endMessage,
    'Discord.js': DiscordModuleConfig.endMessage
  }
} as CLIConfig;
