'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

function isNullOrUndefined(node) {
  if (!node) return false;
  if (node.type === 'NullLiteral') return true;
  if (node.type === 'Identifier' && node.name === 'undefined') return true;
  if (node.type === 'UnaryExpression' && node.operator === 'void') return true;
  return false;
}

function isRenderableExpr(node) {
  if (!node) return false;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
    if (GRANULAR_TAG_NAMES.has(node.callee.name)) return true;
    if (/^[A-Z]/.test(node.callee.name)) return true;
  }
  if (node.type === 'CallExpression' && node.callee && node.callee.type === 'MemberExpression') {
    const prop = node.callee.property;
    if (prop && prop.type === 'Identifier' && /^[A-Z]/.test(prop.name)) return true;
  }
  return false;
}

function isInsideRenderTreeArgument(path) {
  let cur = path && path.parentPath;
  while (cur) {
    const t = cur.node && cur.node.type;
    if (t === 'JSXExpressionContainer' || t === 'JSXAttribute' || t === 'JSXElement' || t === 'JSXFragment') return true;
    if (t === 'CallExpression') {
      const callee = cur.node.callee;
      if (callee && callee.type === 'Identifier') {
        if (GRANULAR_TAG_NAMES.has(callee.name)) return true;
        if (/^[A-Z]/.test(callee.name)) return true;
      }
      if (callee && callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier' && /^[A-Z]/.test(callee.property.name)) {
        return true;
      }
    }
    cur = cur.parentPath;
  }
  return false;
}

module.exports = {
  id: 'prefer-and-over-ternary-null',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Granular treats falsy children (`null`, `undefined`, `false`) as nothing. `cond ? <X/> : null` is verbose noise; use `cond && <X/>` instead. Only applies when the condition is not a reactive source (use `when()` for those).',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "Prefer && Over `cond ? X : null`".',
  },
  create(context) {
    return {
      ConditionalExpression(path) {
        const node = path.node;
        if (!isNullOrUndefined(node.alternate)) return;
        if (!isRenderableExpr(node.consequent)) return;
        if (!isInsideRenderTreeArgument(path)) return;
        // Skip when the condition is reactive - that's covered by
        // no-state-truthy-and / prefer-when-over-ternary (which suggest when()).
        if (
          (node.test.type === 'Identifier' || node.test.type === 'MemberExpression') &&
          context.isMemberRootReactive(node.test, path)
        ) {
          return;
        }
        const condSrc = context.source.slice(node.test.start, node.test.end);
        const trueSrc = context.source.slice(node.consequent.start, node.consequent.end);
        context.report({
          node,
          message: `\`${condSrc} ? ... : null\` is noise — Granular drops falsy children. Use \`${condSrc} && ${trueSrc}\` instead.`,
        });
      },
    };
  },
};
