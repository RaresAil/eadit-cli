import { FileCreateType } from '../index';
import { ReplaceType, ModulesData } from '../functions/createEADITApp';
import colors from 'colors/safe';

interface ExpressModuleConfig {
  fileTypes: FileCreateType;
  paths: {
    [key: string]: string;
  };
  github: string;
  modules: ModulesData;
  endMessage: string;
}

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
        with:
          "Injector.inject('MongooseConfig', { connectionURL: 'MONGO_CONN_URL' }, InjectType.Variable);",
        ask: ['MONGO_CONN_URL']
      },
      {
        type: ReplaceType.IndexInjectVar,
        with: "Injector.inject('Mongoose', mongoose, InjectType.Variable);"
      },
      {
        type: ReplaceType.ServerRetriveVar,
        with: `
  @Retrive('Mongoose')
  private mongoose?: Mongoose;
        `
      },
      {
        type: ReplaceType.ServerRetriveVar,
        with: `
  @Retrive('MongooseConfig')
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
        type: ReplaceType.ServerRetriveVar,
        with: `
  @Retrive('Sequelize')
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
    replacements: [
      {
        type: ReplaceType.IndexImport,
        with: "import cookieParser from 'cookie-parser';"
      },
      {
        type: ReplaceType.IndexInjectMiddleware,
        with: " cookieParser('COOKIE-PARSER-SECRET-TOKEN'),",
        ask: ['COOKIE-PARSER-SECRET-TOKEN']
      }
    ]
  },
  'CSRF Middleware (Cookie Parser is required!)': {
    packageName: 'csrf',
    devPackage: '@types/csrf',
    template: 'csrf_middleware.txt',
    templateName: 'CSRFMiddleware',
    templateLocation: ['src', 'middlewares'],
    replacements: [
      {
        type: ReplaceType.IndexImport,
        with:
          "import CSRFMiddleware, { CSRFProtectionMiddleware } from './middlewares/CSRFMiddleware';"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with:
          "Injector.inject('CSRFMiddleware', CSRFMiddleware, InjectType.Middleware);"
      },
      {
        type: ReplaceType.IndexInjectVar,
        with:
          "Injector.inject('CSRFProtectionMiddleware', CSRFProtectionMiddleware, InjectType.Middleware);"
      }
    ]
  }
};

export default {
  github:
    'https://github.com/RaresAil/express-adr-dependency-injection-typescript-example.git',
  paths: {
    Action: 'src/actions',
    Domain: 'src/domain',
    Middleware: 'src/middlewares',
    Responder: 'src/responders',
    Entity: 'src/domain/entities'
  },
  fileTypes: {
    Action: {
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
