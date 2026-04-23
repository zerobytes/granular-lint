'use strict';

const { parse } = require('@babel/parser');

const BASE_PLUGINS = [
  'jsx',
  'asyncGenerators',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'doExpressions',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'functionBind',
  'functionSent',
  'importMeta',
  'logicalAssignment',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'optionalCatchBinding',
  'optionalChaining',
  'topLevelAwait',
  'throwExpressions',
];

function pluginsFor(filePath) {
  const isTS = /\.tsx?$/.test(filePath || '');
  return isTS ? [...BASE_PLUGINS, 'typescript'] : [...BASE_PLUGINS];
}

function parseSource(source, filePath) {
  return parse(source, {
    sourceType: 'module',
    sourceFilename: filePath,
    allowReturnOutsideFunction: false,
    allowAwaitOutsideFunction: true,
    errorRecovery: true,
    tokens: false,
    ranges: true,
    plugins: pluginsFor(filePath),
  });
}

module.exports = { parseSource };
