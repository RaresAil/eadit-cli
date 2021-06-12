import colors from 'colors/safe';

import { FileCreateType } from '../index';
import {
  ReplaceType,
  ModulesData,
  ReplacementOb
} from '../functions/createEADITApp';

interface ExpressModuleConfig {
  fileTypes: FileCreateType;
  paths: {
    [key: string]: string;
  };
  github: string;
  modules: ModulesData;
  endMessage: string;
}

const cookieParserReplacements: ReplacementOb[] = [
  {
    key: 'cookie-parser-import',
    type: ReplaceType.IndexImport,
    with: "import cookieParser from 'cookie-parser';"
  },
  {
    key: 'cookie-parser-middle',
    type: ReplaceType.IndexInjectMiddleware,
    with: " cookieParser('COOKIE-PARSER-SECRET-TOKEN'),",
    ask: ['COOKIE-PARSER-SECRET-TOKEN']
  }
];
const urlencodedBodyParser = {
  key: 'body-parser-urlencoded',
  type: ReplaceType.IndexInjectMiddleware,
  with: ' bodyParser.urlencoded({ extended: false }),'
};

const modulesData: ModulesData = {
  'Morgan (HTTP request logger middleware for node.js)': {
    packageName: 'morgan',
    devPackage: '@types/morgan',
    replacements: [
      {
        type: ReplaceType.IndexImport,
        with: "import morgan from 'morgan';"
      },
      {
        type: ReplaceType.IndexInjectMiddleware,
        with: " morgan('dev'),"
      }
    ]
  },
  Mongoose: {
    packageName: 'mongoose',
    devPackage: '@types/mongoose',
    template: 'mongoose.txt',
    replacements: [
      {
        type: ReplaceType.IndexImport,
        with: "import mongoose from 'mongoose';"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('MongooseConfig', { connectionURL: 'MONGO_CONN_URL' }, InjectType.Variable);",
        ask: ['MONGO_CONN_URL']
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('Mongoose', mongoose, InjectType.Variable);"
      },
      {
        type: ReplaceType.ServerRetrieveVar,
        with: `
  @Retrieve('Mongoose')
  private mongoose?: Mongoose;
        `
      },
      {
        type: ReplaceType.ServerRetrieveVar,
        with: `
  @Retrieve('MongooseConfig')
  private mongooseConfig?: any;
        `
      },
      {
        type: ReplaceType.ServerBeforeStart,
        with: `
      if (this.mongooseConfig?.connectionURL && this.mongooseConfig?.connectionURL.trim() !== '') {
        await this.mongoose?.connect(this.mongooseConfig?.connectionURL, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true
        });
        log('Mongoose Connected');
      }
        `
      },
      {
        type: ReplaceType.ServerImport,
        with: "import { Mongoose } from 'mongoose';"
      }
    ]
  },
  'Sequelize ORM': {
    packageName: 'sequelize',
    template: 'sequelize.txt',
    databases: {
      Postgres: {
        packageName: 'pg pg-hstore',
        dialectName: 'postgres'
      },
      'Maria DB': {
        packageName: 'mariadb',
        dialectName: 'mariadb'
      },
      'MySQL 2': {
        packageName: 'mysql2',
        dialectName: 'mysql'
      },
      'SQLite 3': {
        packageName: 'sqlite3',
        dialectName: 'sqlite'
      },
      'Microsoft SQL Server ': {
        packageName: 'tedious',
        dialectName: 'mssql'
      }
    },
    replacements: [
      {
        type: ReplaceType.IndexImport,
        with: "import { Sequelize } from 'sequelize';"
      },
      {
        type: ReplaceType.ServerImport,
        with: "import { Sequelize } from 'sequelize';"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: `
Injector.inject('Sequelize', new Sequelize(
  'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD', {
  host: 'DATABASE_HOST',
  port: DATABASE_PORT,
  dialect: 'CLI_SEQUELIZE_DIALECT_NAME',
  logging: false,
  dialectOptions: {
    timezone: 'Etc/GMT0'
  }
}), InjectType.Variable);
        `,
        ask: [
          'DATABASE_NAME',
          'DATABASE_USER',
          'DATABASE_PASSWORD',
          'DATABASE_HOST',
          'DATABASE_PORT'
        ]
      },
      {
        type: ReplaceType.ServerRetrieveVar,
        with: `
  @Retrieve('Sequelize')
  private sequelize?: Sequelize;
        `
      },
      {
        type: ReplaceType.ServerBeforeStart,
        with: `
      if (this.sequelize) {
        await this.sequelize.authenticate();
        await this.sequelize.sync();
      }
        `
      }
    ]
  },
  'JSON Web Token (jsonwebtoken)': {
    packageName: 'jsonwebtoken',
    devPackage: '@types/jsonwebtoken'
  },
  'Cookie Parser': {
    packageName: 'cookie-parser',
    devPackage: '@types/cookie-parser',
    replacements: [...cookieParserReplacements]
  },
  'CSRF Middleware': {
    packageName: ['csrf', 'cookie-parser'],
    devPackage: ['@types/csrf', '@types/cookie-parser'],
    template: 'csrf_middleware.txt',
    templateName: 'CSRFMiddleware',
    templateLocation: ['src', 'middlewares'],
    replacements: [
      ...cookieParserReplacements,
      {
        type: ReplaceType.IndexImport,
        with: "import CSRFMiddleware, { CSRFProtectionMiddleware } from './middlewares/CSRFMiddleware';"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('CSRFMiddleware', CSRFMiddleware, InjectType.Middleware);"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('CSRFProtectionMiddleware', CSRFProtectionMiddleware, InjectType.Middleware);"
      }
    ]
  },
  'OAuth2 (Authorization Code Grant with PKCE)': {
    packageName: ['@adr-express-ts/oauth2', 'cookie-parser', 'jsonwebtoken'],
    devPackage: [
      '@types/cookie-parser',
      '@types/jsonwebtoken',
      '@types/oauth2-server'
    ],
    multipleTemplates: [
      {
        template: 'oauth2-code-grant',
        location: ['src', 'auth']
      },
      {
        template: 'oauth2',
        location: ['src', 'auth']
      },
      {
        template: ['oauth2-code-grant-extras', 'OAuthCodeGrantAction.txt'],
        location: ['src', 'actions']
      }
    ],
    replacements: [
      ...cookieParserReplacements,
      {
        type: ReplaceType.IndexImport,
        with: "import AuthorizationCodeGrant from './auth/AuthorizationCodeGrant';"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('AuthorizationCodeGrant', AuthorizationCodeGrant);"
      },
      urlencodedBodyParser
    ]
  },
  'OAuth2 (Password Grant)': {
    packageName: ['@adr-express-ts/oauth2', 'cookie-parser', 'jsonwebtoken'],
    devPackage: [
      '@types/cookie-parser',
      '@types/jsonwebtoken',
      '@types/oauth2-server'
    ],
    multipleTemplates: [
      {
        template: 'oauth2-password-grant',
        location: ['src', 'auth']
      },
      {
        template: 'oauth2',
        location: ['src', 'auth']
      },
      {
        template: [
          'oauth2-password-grant-extras',
          'OAuthPasswordGrantAction.txt'
        ],
        location: ['src', 'actions']
      },
      {
        template: [
          'oauth2-password-grant-extras',
          'OAuthPasswordGrantResponder.txt'
        ],
        location: ['src', 'responders']
      }
    ],
    replacements: [
      ...cookieParserReplacements,
      {
        type: ReplaceType.IndexImport,
        with: "import PasswordGrant from './auth/PasswordGrant';"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('PasswordGrant', PasswordGrant);"
      },
      urlencodedBodyParser
    ]
  }
};

export default {
  github: 'https://github.com/RaresAil/adr-express-ts-template.git',
  paths: {
    Action: 'src/actions',
    Domain: 'src/domain',
    Middleware: 'src/middlewares',
    Responder: 'src/responders',
    Entity: 'src/domain/entities'
  },
  fileTypes: {
    Action: {
      recursiveDir: true,
      file: 'action_model.txt',
      suffix: 'Action',
      ask: [
        {
          name: '__ACTION_NAME__',
          question: 'What name do you want for the Action?'
        },
        {
          name: '__ACTION_ROUTE__',
          question: 'What route do you want for the Action?'
        },
        {
          name: '__FILE_NAME__',
          question: 'What name do you want for the file? (Don\'t include ".ts")'
        }
      ]
    },
    Domain: {
      file: 'domain_model.txt',
      suffix: 'Domain',
      ask: [
        {
          name: '__DOMAIN_NAME__',
          question: 'What name do you want for the Domain?'
        },
        {
          name: '__FILE_NAME__',
          question:
            'What name do you want for the file? (Don\'t need to include ".ts")'
        }
      ]
    },
    Responder: {
      file: 'responder_model.txt',
      suffix: 'Responder',
      ask: [
        {
          name: '__RESPONDER_NAME__',
          question: 'What name do you want for the Responder?'
        },
        {
          name: '__FILE_NAME__',
          question:
            'What name do you want for the file? (Don\'t need to include ".ts")'
        }
      ]
    },
    Entity: {
      file: 'entity_model.txt',
      suffix: 'Entity',
      ask: [
        {
          name: '__ENTITY_NAME__',
          question: 'What name do you want for the Entity?'
        },
        {
          name: '__FILE_NAME__',
          question:
            'What name do you want for the file? (Don\'t need to include ".ts")'
        }
      ]
    },
    Middleware: {
      file: 'middleware_model.txt',
      suffix: 'Middleware',
      ask: [
        {
          name: '__MIDDLE_NAME__',
          question: 'What name do you want for the Middleware?'
        },
        {
          name: '__FILE_NAME__',
          question:
            'What name do you want for the file? (Don\'t need to include ".ts")'
        }
      ]
    }
  },
  modules: modulesData,
  endMessage: `You can create ${colors.magenta('Actions')}/${colors.magenta(
    'Domains'
  )}/${colors.magenta('Responders')}/${colors.magenta(
    'Entities'
  )}/${colors.magenta('Middlewares')}.`
} as ExpressModuleConfig;
