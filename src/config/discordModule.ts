import colors from 'colors/safe';

import { FileCreateType } from '../index';
import { ModulesData } from '../functions/createEADITApp';

interface DiscordModuleConfig {
  fileTypes: FileCreateType;
  paths: {
    [key: string]: string;
  };
  github: string;
  modules: ModulesData;
  endMessage: string;
}

const modulesData: ModulesData = {};

export default {
  github:
    'https://github.com/RaresAil/discordjs-dependency-injection-typescript-example.git',
  paths: {
    Command: 'src/commands'
  },
  fileTypes: {
    Command: {
      file: 'discord_command.txt',
      suffix: 'Command',
      ask: [
        {
          name: '__DIS_COMMAND_NAME__',
          question: 'What name do you want for the Command?'
        },
        {
          name: '__DIS_COMMAND_DESC__',
          question: 'What description do you want for the Command?'
        },
        {
          name: '__FILE_NAME__',
          question: 'What name do you want for the file? (Don\'t include ".ts")'
        }
      ]
    }
  },
  modules: modulesData,
  endMessage: `You can create ${colors.magenta('Commands')}.`
} as DiscordModuleConfig;
