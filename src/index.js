'use strict';

const fs = require('fs');
const path = require('path');

const { lintSource } = require('./linter');
const { loadConfig, DEFAULT_CONFIG } = require('./config');
const { loadRules } = require('./rules');
const { formatStylish, formatJson } = require('./reporter');

function lintFile(filePath, options = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  return lintSource(source, filePath, options);
}

function isIgnored(filePath, ignorePatterns, cwd) {
  const rel = path.relative(cwd, filePath).split(path.sep).join('/');
  for (const pattern of ignorePatterns) {
    const re = globToRegExp(pattern);
    if (re.test(rel) || re.test('/' + rel)) return true;
  }
  return false;
}

function globToRegExp(glob) {
  // Minimal glob → regex: ** -> .*, * -> [^/]*, ? -> .
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // ** or **/
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '.';
    } else if ('.+^${}()|[]\\'.indexOf(c) !== -1) {
      out += '\\' + c;
    } else {
      out += c;
    }
  }
  return new RegExp('^' + out + '$');
}

function walk(target, extensions, ignorePatterns, cwd, out = []) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return out;
  }
  if (stat.isFile()) {
    const ext = path.extname(target);
    if (extensions.includes(ext) && !isIgnored(target, ignorePatterns, cwd)) out.push(target);
    return out;
  }
  if (stat.isDirectory()) {
    if (isIgnored(target, ignorePatterns, cwd)) return out;
    for (const name of fs.readdirSync(target)) {
      walk(path.join(target, name), extensions, ignorePatterns, cwd, out);
    }
  }
  return out;
}

function lintPaths(targets, options = {}) {
  const cwd = options.cwd || process.cwd();
  const config = Object.assign({}, DEFAULT_CONFIG, loadConfig(cwd), options);
  const files = [];
  for (const target of targets) {
    const abs = path.isAbsolute(target) ? target : path.join(cwd, target);
    walk(abs, config.extensions, config.ignore, cwd, files);
  }

  const results = [];
  for (const file of files) {
    results.push(lintFile(file, config));
  }
  return results;
}

module.exports = {
  lintSource,
  lintFile,
  lintPaths,
  loadConfig,
  loadRules,
  formatStylish,
  formatJson,
};
