'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.next/**',
    '**/coverage/**',
  ],
  rules: null, // null = all
  disable: [],
};

function loadConfig(cwd = process.cwd()) {
  const candidates = [
    'granular-lint.config.json',
    '.granular-lintrc',
    '.granular-lintrc.json',
  ];
  for (const name of candidates) {
    const file = path.join(cwd, name);
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Object.assign({}, DEFAULT_CONFIG, data);
      } catch (err) {
        throw new Error(`Failed to read ${name}: ${err.message}`);
      }
    }
  }
  return Object.assign({}, DEFAULT_CONFIG);
}

module.exports = { loadConfig, DEFAULT_CONFIG };
