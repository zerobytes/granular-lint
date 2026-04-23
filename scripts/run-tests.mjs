#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { lintSource } = require(join(__dirname, '..', 'src', 'index.js'));

const FIXTURES = join(__dirname, '..', 'tests', 'fixtures');

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, info) {
  if (cond) {
    pass++;
    process.stdout.write('.');
  } else {
    fail++;
    failures.push({ name, info });
    process.stdout.write('F');
  }
}

function lint(file) {
  const src = readFileSync(file, 'utf8');
  return lintSource(src, file);
}

function ruleIdsFor(messages) {
  return new Set(messages.map((m) => m.ruleId));
}

// --- GOOD fixtures should have no errors and no warnings.
const goodDir = join(FIXTURES, 'good');
for (const name of readdirSync(goodDir)) {
  const file = join(goodDir, name);
  const result = lint(file);
  const has = result.messages.length;
  check(`good/${name} has no messages`, has === 0, result.messages);
}

// --- BAD fixtures should report specific rule ids.
const expected = {
  'state-mutation.js': ['no-state-mutation', 'state-set-misuse'],
  'list-render.js': [
    'no-state-in-list-render',
    'no-get-at-top-of-list-render',
    'no-or-defaults-on-state-path',
  ],
  'when-eager.js': ['when-arrow-functions'],
  'react-hooks.js': ['no-react-hooks'],
  'wrong-imports.js': ['correct-import-package'],
  'jsx-anti-patterns.jsx': [
    'no-state-truthy-and',
    'jsx-no-array-map',
    'jsx-no-children-get-snapshot',
  ],
  'cleanup-return.js': ['no-cleanup-return-from-component'],
  'list-render-call.js': ['no-component-call-as-tag-child'],
  'map-inside-compute-shadow.js': ['prefer-list-inside-compute'],
  'empty-props.js': ['no-empty-props-object'],
  'ternary-null.js': ['prefer-and-over-ternary-null'],
  'state-truthy-and.js': ['no-state-truthy-and'],
  'compute-tree.js': ['no-compute-returning-tree'],
  'match-eager.js': ['match-arrow-functions'],
};

const badDir = join(FIXTURES, 'bad');
for (const [fixture, ruleIds] of Object.entries(expected)) {
  const file = join(badDir, fixture);
  const result = lint(file);
  const ids = ruleIdsFor(result.messages);
  for (const ruleId of ruleIds) {
    check(`bad/${fixture} reports ${ruleId}`, ids.has(ruleId), {
      reported: Array.from(ids),
      messages: result.messages.map((m) => `${m.line}:${m.column} ${m.ruleId} - ${m.message}`),
    });
  }
}

console.log(`\n\n${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of failures) {
    console.log('\n--- FAIL:', f.name);
    console.dir(f.info, { depth: 4 });
  }
  process.exit(1);
}
