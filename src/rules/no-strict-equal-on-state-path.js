'use strict';

/**
 * `state === 'foo'` (or `state.foo === 'bar'`, `state !== something`)
 * compares the proxy reference, never the underlying value. The proxy is
 * always a fresh object reference, so strict equality against a primitive
 * literal is *always* false (and `!==` always true). Use `state.get()` to
 * read the underlying value, or `when(state, ...)` for reactive branching.
 */

function isPrimitiveLiteral(node) {
  if (!node) return false;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral'
    || node.type === 'BooleanLiteral' || node.type === 'NullLiteral') return true;
  if (node.type === 'Literal') {
    const v = node.value;
    return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return true;
  return false;
}

function isStatePathLikeExpression(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return true;
  if (node.type === 'MemberExpression') {
    if (node.computed) return false;
    if (node.property && node.property.type === 'Identifier'
      && (node.property.name === 'get' || node.property.name === 'set')) return false;
    let cur = node;
    while (cur && cur.type === 'MemberExpression') cur = cur.object;
    return !!(cur && cur.type === 'Identifier');
  }
  return false;
}

module.exports = {
  id: 'no-strict-equal-on-state-path',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      '`state === literal` (or `state.x !== literal`) compares the reactive proxy reference, not its value, so the result is always false (or always true for `!==`). Use `state.get() === literal` to read the underlying value, or `when(state, ...)` for reactive branching.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Reactivity / Reading reactive values.',
  },
  create(context) {
    function check(node, side, otherSide, path) {
      if (!isStatePathLikeExpression(side)) return;
      if (!context.isMemberRootReactive(side, path)) return;
      if (!isPrimitiveLiteral(otherSide)) return;
      const src = context.source.slice(side.start, side.end);
      context.report({
        node,
        message: `\`${src} ${node.operator} <literal>\` compares a reactive proxy by reference and never matches a primitive. Use \`${src}.get() ${node.operator} <literal>\`.`,
      });
    }

    return {
      BinaryExpression(path) {
        const node = path.node;
        if (!['===', '!==', '==', '!='].includes(node.operator)) return;
        check(node, node.left, node.right, path);
        check(node, node.right, node.left, path);
      },
    };
  },
};
