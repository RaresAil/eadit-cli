import ProcessEnv from './ProcessEnv';

interface ExecuteOptions {
  env?: ProcessEnv;
  maxTimeout?: number;
}

export default ExecuteOptions;
