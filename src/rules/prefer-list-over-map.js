'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

function calleeReturnsRenderable(arrowOrFn) {
  if (!arrowOrFn) return false;
  let body = arrowOrFn.body;
  if (!body) return false;
  if (body.type === 'BlockStatement') {
    for (const stmt of body.body) {
      if (stmt.type === 'ReturnStatement') {
        return isRenderableExpr(stmt.argument);
      }
    }
    return false;
  }
  return isRenderableExpr(body);
}

function isRenderableExpr(node) {
  if (!node) return false;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
    if (GRANULAR_TAG_NAMES.has(node.callee.name)) return true;
    if (/^[A-Z]/.test(node.callee.name)) return true;
  }
  if (node.type === 'ParenthesizedExpression') return isRenderableExpr(node.expression);
  return false;
}

module.exports = {
  id: 'prefer-list-over-map',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      '`array.map(x => <Row/>)` runs once and never updates when the array changes. For reactive arrays, use `list(items, (x) => <Row/>)` from @granularjs/core for fine-grained patch-based updates.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "Lists - list()".',
  },
  create(context) {
    return {
      CallExpression(path) {
        const callee = path.node.callee;
        if (!callee || callee.type !== 'MemberExpression') return;
        if (!callee.property || callee.property.type !== 'Identifier' || callee.property.name !== 'map') return;
        if (!context.isMemberRootReactive(callee.object, path)) return;
        const arg = path.node.arguments[0];
        if (!arg) return;
        if (!calleeReturnsRenderable(arg)) return;
        // Skip JSX-context cases - jsx-no-array-map covers them.
        let cur = path.parentPath;
        while (cur) {
          const t = cur.node && cur.node.type;
          if (t === 'JSXExpressionContainer' || t === 'JSXElement' || t === 'JSXFragment' || t === 'JSXAttribute') return;
          cur = cur.parentPath;
        }
        context.report({
          node: path.node,
          message: `\`.map()\` over a reactive array produces a static snapshot of nodes. Use \`list(<source>, (item) => ...)\` from @granularjs/core for fine-grained reactive rendering.`,
        });
      },
    };
  },
};
