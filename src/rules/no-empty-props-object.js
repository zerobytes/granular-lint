'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');
const { startsWithCapital } = require('../utils/ast');

function isEmptyObjectExpression(node) {
  if (!node || node.type !== 'ObjectExpression') return false;
  if (!Array.isArray(node.properties)) return false;
  if (node.properties.length === 0) return true;
  // Treat objects that contain only empty spread (e.g. `{ ...nothing }`) as
  // non-empty for safety.
  return false;
}

function isLikelyComponentOrTagCall(node, importIndex) {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (!callee) return false;
  if (callee.type === 'Identifier') {
    if (importIndex.tagLocals && importIndex.tagLocals.has(callee.name)) return true;
    if (GRANULAR_TAG_NAMES.has(callee.name)) return true;
    if (startsWithCapital(callee.name)) return true;
    return false;
  }
  if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier') {
    // Component namespaces like List.Item, Card.Section, GridTable.GridRow.
    return startsWithCapital(callee.property.name);
  }
  return false;
}

module.exports = {
  id: 'no-empty-props-object',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Empty `{}` props objects passed to Granular tags or components are pure noise. `splitPropsChildren(args)` does not require a positional props argument; drop the empty object.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "No Required Props — Drop Empty `{}` Arguments".',
  },
  create(context) {
    return {
      CallExpression(path) {
        const node = path.node;
        if (!isLikelyComponentOrTagCall(node, context.importIndex)) return;
        if (!Array.isArray(node.arguments) || node.arguments.length === 0) return;
        for (const arg of node.arguments) {
          if (isEmptyObjectExpression(arg)) {
            context.report({
              node: arg,
              message:
                'Empty `{}` props object on a Granular tag/component is unnecessary noise. Drop it: there is no required positional props argument.',
            });
          }
        }
      },
    };
  },
};
