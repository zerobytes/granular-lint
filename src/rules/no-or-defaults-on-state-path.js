'use strict';

const { getCalleeName, isArrowOrFunctionExpr } = require('../utils/ast');

function isListRenderFn(arrowPath) {
  const parent = arrowPath.parentPath;
  if (!parent || parent.node.type !== 'CallExpression') return false;
  const calleeName = getCalleeName(parent.node);
  if (calleeName !== 'list' && calleeName !== 'virtualList') return false;
  const args = parent.node.arguments;
  const idx = args.indexOf(arrowPath.node);
  return idx === 1 || idx === 2;
}

function findEnclosingListItemNames(path) {
  let cur = path && path.parentPath;
  while (cur) {
    if (isArrowOrFunctionExpr(cur.node) && isListRenderFn(cur)) {
      const params = cur.node.params || [];
      const out = [];
      if (params[0] && params[0].type === 'Identifier') out.push(params[0].name);
      if (params[1] && params[1].type === 'Identifier') out.push(params[1].name);
      return out;
    }
    cur = cur.parentPath;
  }
  return null;
}

function rootIdentifierName(node) {
  let cur = node;
  while (cur && cur.type === 'MemberExpression') cur = cur.object;
  return cur && cur.type === 'Identifier' ? cur.name : null;
}

function isStatePathLikeExpression(node, names) {
  if (!node) return false;
  if (node.type === 'Identifier' && names.includes(node.name)) return true;
  if (node.type !== 'MemberExpression') return false;
  if (node.computed) return false;
  if (node.property.type === 'Identifier' && (node.property.name === 'get' || node.property.name === 'set')) return false;
  const root = rootIdentifierName(node);
  return !!root && names.includes(root);
}

module.exports = {
  id: 'no-or-defaults-on-state-path',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      'A StatePath (e.g. `item.size`) is always truthy because it is a reactive proxy, not the underlying value. Using `||` or `??` to default it never falls through. Use `after(item.size).compute(s => s || \'md\')` instead.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "list() - DEFAULTS - use after().compute()".',
  },
  create(context) {
    return {
      LogicalExpression(path) {
        const node = path.node;
        if (node.operator !== '||' && node.operator !== '??') return;
        const names = findEnclosingListItemNames(path);
        if (!names || names.length === 0) return;
        if (isStatePathLikeExpression(node.left, names)) {
          context.report({
            node,
            message: `\`${node.operator}\` on a reactive StatePath is always truthy and never falls back. Wrap with \`after(<path>).compute(v => v ${node.operator} <default>)\` for a reactive default.`,
          });
        }
      },
    };
  },
};
