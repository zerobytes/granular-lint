'use strict';

const fs = require('fs');
const path = require('path');

const RULE_FILES = [
  'correct-import-package',
  'no-react-hooks',
  'no-state-mutation',
  'no-state-in-list-render',
  'no-get-at-top-of-list-render',
  'no-or-defaults-on-state-path',
  'when-arrow-functions',
  'when-non-arrow-component-call',
  'no-cleanup-return-from-component',
  'prefer-when-over-ternary',
  'prefer-list-over-map',
  'prefer-list-inside-compute',
  'no-array-index-assignment',
  'after-targets',
  'state-set-misuse',
  'no-state-in-jsx-children-snapshot',
  'jsx-cond-and-render',
  'jsx-no-children-get-snapshot',
  'jsx-no-array-map',
  'no-component-call-as-tag-child',
  'no-empty-props-object',
  'prefer-and-over-ternary-null',
  'no-state-truthy-and',
  'no-compute-returning-tree',
  'match-arrow-functions',
];

function loadRules(options = {}) {
  const enabled = (options && options.rules) || null;
  const disabled = (options && options.disable) || null;
  const list = [];
  for (const name of RULE_FILES) {
    const file = path.join(__dirname, name + '.js');
    if (!fs.existsSync(file)) continue;
    const rule = require(file);
    if (!rule || !rule.id || typeof rule.create !== 'function') continue;
    if (enabled && !enabled.includes(rule.id)) continue;
    if (disabled && disabled.includes(rule.id)) continue;
    list.push(rule);
  }
  return list;
}

module.exports = { loadRules, RULE_FILES };
