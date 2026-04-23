'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

function isReactiveCallExpression(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee && callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier') {
    if (callee.property.name === 'compute') return true;
  }
  if (callee && callee.type === 'Identifier' && (callee.name === 'after' || callee.name === 'before')) return true;
  return false;
}

function exprLooksLikeRenderable(node) {
  if (!node) return false;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee && callee.type === 'Identifier' && GRANULAR_TAG_NAMES.has(callee.name)) return true;
    if (callee && callee.type === 'Identifier' && /^[A-Z]/.test(callee.name)) return true;
  }
  return false;
}

function isInsideAfterCompute(path) {
  let cur = path && path.parentPath;
  while (cur) {
    const n = cur.node;
    if (n && n.type === 'CallExpression') {
      const callee = n.callee;
      if (
        callee &&
        callee.type === 'MemberExpression' &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        (callee.property.name === 'compute' || callee.property.name === 'change')
      ) {
        return true;
      }
    }
    cur = cur.parentPath;
  }
  return false;
}

function isInsideJsx(path) {
  let cur = path && path.parentPath;
  while (cur) {
    const t = cur.node && cur.node.type;
    if (t === 'JSXExpressionContainer' || t === 'JSXElement' || t === 'JSXFragment' || t === 'JSXAttribute') return true;
    cur = cur.parentPath;
  }
  return false;
}

module.exports = {
  id: 'prefer-when-over-ternary',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      'Ternaries (`cond ? A() : B()`) and short-circuits (`cond && X()`) on a reactive condition are evaluated only once at render time. The DOM will never update when the source changes. Use `when(cond, () => A(), () => B())` for reactive branching.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Conditional Rendering / Anti-Patterns.',
  },
  create(context) {
    return {
      ConditionalExpression(path) {
        const node = path.node;
        if (isInsideAfterCompute(path)) return;
        if (isInsideJsx(path)) return;
        if (!isReactiveCallExpression(node.test)) return;
        if (!exprLooksLikeRenderable(node.consequent) && !exprLooksLikeRenderable(node.alternate)) return;
        context.report({
          node,
          message: `Ternary on a reactive expression \`${context.source.slice(node.test.start, node.test.end)}\` is evaluated once at construction time. Use \`when(${context.source.slice(node.test.start, node.test.end)}, () => <true>, () => <false>)\` for reactive branching.`,
        });
      },
      LogicalExpression(path) {
        const node = path.node;
        if (node.operator !== '&&') return;
        if (isInsideAfterCompute(path)) return;
        if (isInsideJsx(path)) return;
        if (!isReactiveCallExpression(node.left)) return;
        if (!exprLooksLikeRenderable(node.right)) return;
        context.report({
          node,
          message: `\`<reactive> && <renderable>\` evaluates only at construction time. Use \`when(${context.source.slice(node.left.start, node.left.end)}, () => <renderable>)\` for a reactive show/hide.`,
        });
      },
    };
  },
};
