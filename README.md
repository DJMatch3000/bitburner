## Preface
Please note that all code here is based off of the original official bitburner templates for vs code (https://github.com/bitburner-official/vscode-template). This template is meant to be a better place to get started with bitburner code outside of the app. All the differences for this project have been made to aleviate some of the troubles with getting started. Additionally this solution works both on the web version as well as on steam.

This project is keeps all the settings to launch from vscode, but vscode is not a requirement for this project.

## Dependencies
[Node.js](https://nodejs.org/en/download/) required for compiling typescript and installing dependencies

## Installation
```
git clone https://github.com/bitburner-official/vscode-template
npm install
npm run defs
```

## How to use this template
Write all your typescript source code in the `/src` directory

To autocompile as you save, run `npm run watch` in a terminal

To update your Netscript Definitions, run `npm run defs` in a terminal

To sync your files to Bitburner run `npm run remoteapi`. Within bitburner you will need to go to the options under remote api and connect on port 9222

If you run `watcher.js` in game, the game will automatically detect file changes and restart the associated scripts

## Imports
To ensure both the game and typescript have no issues with import paths, your import statements should follow a few formatting rules:

 * Paths must be absolute from the root of `src/`, which will be equivalent to the root directory of your home drive
 * Paths must contain no leading slash
 * Paths must end with no file extension

 ### Examples:

To import `helperFunction` from the file `helpers.ts` located in the directory `src/lib/`: 

```js
import { helperFunction } from 'lib/helpers'
```

To import all functions from the file `helpers.ts` located in the `src/lib/` directory as the namespace `helpers`:

```js
import * as helpers from 'lib/helpers'
```

To import `someFunction` from the file `main.ts` located in the `src/` directory:

```js
import { someFunction } from 'main'
```

## Deugging

For debugging bitburner on Steam you will need to enable a remote debugging port. This can be done by rightclicking bitburner in your Steam library and selecting properties. There you need to add `--remote-debugging-port=9222` [Thanks @DarkMio]

When debugging you see errors like the following:

```
Could not read source map for file:///path/to/Steam/steamapps/common/Bitburner/resources/app/dist/ext/monaco-editor/min/vs/editor/editor.main.js: ENOENT: no such file or directory, open '/path/to/Steam/steamapps/common/Bitburner/resources/app/dist/ext/monaco-editor/min/vs/editor/editor.main.js.map'
```

These errors are to be expected, they are referring to the game's files and the game does not come packaged with sourcemaps.