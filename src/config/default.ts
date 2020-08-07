import Config from '../index';

export interface EADITConfig {
  templates: string[];
  paths: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

export default (templates: string[]): EADITConfig => {
  let paths: {
    [key: string]: {
      [key: string]: string;
    };
  } = {};

  templates.forEach((template) => {
    paths = {
      ...paths,
      [template]: Config.paths[template]
    };
  });

  return {
    templates,
    paths
  };
};
