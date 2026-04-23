'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

function isRenderableExpr(node) {
  if (!node) return false;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  if (node.type === 'CallExpression' && node.callee) {
    if (node.callee.type === 'Identifier') {
      if (GRANULAR_TAG_NAMES.has(node.callee.name)) return true;
      if (/^[A-Z]/.test(node.callee.name)) return true;
    }
    if (
      node.callee.type === 'MemberExpression' &&
      node.callee.property &&
      node.callee.property.type === 'Identifier' &&
      /^[A-Z]/.test(node.callee.property.name)
    ) {
      return true;
    }
  }
  return false;
}

function isLikelyStatePathExpression(node) {
  // A bare `state(x)` value (Identifier reactive local) or a path access on
  // it (`state.foo.bar`) is always a truthy object reference. Plain primitives
  // (string/number/boolean) and `.get()` calls are NOT covered here.
  if (!node) return false;
  if (node.type === 'Identifier') return true;
  if (node.type === 'MemberExpression') {
    let cur = node;
    while (cur && cur.type === 'MemberExpression') cur = cur.object;
    return !!(cur && cur.type === 'Identifier');
  }
  return false;
}

module.exports = {
  id: 'no-state-truthy-and',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      'A reactive state/StatePath/signal reference is always a truthy object — `statePath && X()` therefore always returns `X()` and never reactively hides it. Use `when(statePath, () => X())` instead.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Conditional Rendering / "When NOT to use &&".',
  },
  create(context) {
    return {
      LogicalExpression(path) {
        const node = path.node;
        if (node.operator !== '&&') return;
        if (!isLikelyStatePathExpression(node.left)) return;
        if (!context.isMemberRootReactive(node.left, path)) return;
        if (!isRenderableExpr(node.right)) return;
        const condSrc = context.source.slice(node.left.start, node.left.end);
        context.report({
          node,
          message: `\`${condSrc}\` is a reactive state/StatePath - it is always truthy as an object reference, so \`${condSrc} && X\` always renders X. Use \`when(${condSrc}, () => X)\` for a reactive show/hide.`,
        });
      },
      ConditionalExpression(path) {
        const node = path.node;
        if (!isLikelyStatePathExpression(node.test)) return;
        if (!context.isMemberRootReactive(node.test, path)) return;
        if (!isRenderableExpr(node.consequent) && !isRenderableExpr(node.alternate)) return;
        const condSrc = context.source.slice(node.test.start, node.test.end);
        context.report({
          node,
          message: `\`${condSrc} ? A : B\` always evaluates the same branch because \`${condSrc}\` is a reactive object reference (always truthy). Use \`when(${condSrc}, () => A, () => B)\` for reactive branching.`,
        });
      },
    };
  },
};
