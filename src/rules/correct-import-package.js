'use strict';

const FORBIDDEN = new Map([
  ['granular', '@granularjs/core'],
  ['@granular/core', '@granularjs/core'],
  ['@granular/ui', '@granularjs/ui'],
  ['granular-ui', '@granularjs/ui'],
  ['@granular/jsx', '@granularjs/jsx'],
  ['granular-core', '@granularjs/core'],
  ['granular-jsx', '@granularjs/jsx'],
]);

module.exports = {
  id: 'correct-import-package',
  meta: {
    severity: 'error',
    description:
      'Imports must use the official package names: @granularjs/core, @granularjs/ui, @granularjs/jsx. Aliases like "granular", "@granular/ui", or "granular-ui" are NOT valid published packages.',
    docs: 'See granular/README.md - "Package names".',
  },
  create(context) {
    return {
      ImportDeclaration(path) {
        const source = path.node.source && path.node.source.value;
        if (!source) return;
        if (FORBIDDEN.has(source)) {
          context.report({
            node: path.node.source,
            message: `Invalid Granular package "${source}". Use "${FORBIDDEN.get(source)}" instead.`,
          });
        }
      },
    };
  },
};
