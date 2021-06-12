# @adr-express-ts/cli

This is a CLI for [@adr-express-ts/core](https://github.com/RaresAil/adr-express-ts)

## Install global

For Yarn

```bash
yarn global add @adr-express-ts/cli
```

For NPM

```bash
npm install -g @adr-express-ts/cli
```

## Commands

> If is installed globally, the npx should be removed

### To create a project

```bash
npx @adr-express-ts/cli create [path]
```

e.g.

```bash
npx @adr-express-ts/cli create MyApp
```

To create the project without a sub-folder

```bash
npx @adr-express-ts/cli create .
```

### To create files (e.g. Actions)

Execute the following command in the same folder with the package.json

```bash
npx @adr-express-ts/cli create
```

You will get the following result:
```bash
? What type of file do you want to create? (Use arrow keys)
❯ Action 
  Domain 
  Responder 
  Entity 
  Middleware
```
