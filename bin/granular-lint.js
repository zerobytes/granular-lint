#!/usr/bin/env node
'use strict';

const path = require('path');
const { lintPaths, formatStylish, formatJson, loadRules } = require('../src');

function parseArgs(argv) {
  const opts = {
    targets: [],
    format: 'stylish',
    color: true,
    maxWarnings: -1,
    listRules: false,
    onlyRules: null,
    disableRules: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--format' || a === '-f') opts.format = argv[++i];
    else if (a === '--no-color') opts.color = false;
    else if (a === '--max-warnings') opts.maxWarnings = parseInt(argv[++i], 10);
    else if (a === '--list-rules') opts.listRules = true;
    else if (a === '--only') opts.onlyRules = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--disable') opts.disableRules = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      process.exit(2);
    } else {
      opts.targets.push(a);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`granular-lint — linter for the Granular framework

Usage:
  granular-lint <file|dir> [<file|dir> ...] [options]

Options:
  -f, --format <stylish|json>   Output format (default: stylish)
  --no-color                    Disable ANSI colors
  --max-warnings <n>            Exit with code 1 if warnings exceed n
  --only <rule1,rule2,...>      Only run the listed rules
  --disable <rule1,rule2,...>   Disable the listed rules
  --list-rules                  Print all built-in rules and exit
  -h, --help                    Show this help

Exit codes:
  0   no errors (and warnings within --max-warnings)
  1   errors or warnings beyond threshold
  2   bad CLI usage
`);
}

function listRules() {
  const rules = loadRules();
  console.log('Available rules:\n');
  for (const r of rules) {
    const meta = r.meta || {};
    const sev = meta.severity || 'warning';
    const tags = [];
    if (meta.jsxOnly) tags.push('jsx-only');
    if (meta.requiresGranular) tags.push('requires-granular');
    const tagStr = tags.length ? ` [${tags.join(', ')}]` : '';
    console.log(`  ${r.id}  (${sev})${tagStr}`);
    if (meta.description) console.log(`    ${meta.description}`);
    if (meta.docs) console.log(`    ↪ ${meta.docs}`);
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return process.exit(0);
  }
  if (opts.listRules) {
    listRules();
    return process.exit(0);
  }
  if (opts.targets.length === 0) {
    printHelp();
    return process.exit(2);
  }

  const results = lintPaths(opts.targets, {
    rules: opts.onlyRules,
    disable: opts.disableRules,
  });

  if (opts.format === 'json') {
    console.log(formatJson(results));
    const totalErrors = results.reduce((acc, r) => acc + r.messages.filter((m) => m.severity === 'error').length, 0);
    return process.exit(totalErrors > 0 ? 1 : 0);
  }

  const { text, totalErrors, totalWarnings } = formatStylish(results, { color: opts.color });
  process.stdout.write(text + '\n');

  if (totalErrors > 0) return process.exit(1);
  if (opts.maxWarnings >= 0 && totalWarnings > opts.maxWarnings) return process.exit(1);
  return process.exit(0);
}

main();
