'use strict';

function isReactiveCallExpression(node) {
  if (!node || node.type !== 'CallExpression' || !node.callee) return false;
  if (node.callee.type === 'Identifier' && (node.callee.name === 'after' || node.callee.name === 'before')) return true;
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'compute'
  ) {
    return true;
  }
  return false;
}

module.exports = {
  id: 'jsx-cond-and-render',
  meta: {
    severity: 'warning',
    jsxOnly: true,
    description:
      'In JSX, `{cond && <X/>}` and `{cond ? <A/> : <B/>}` are evaluated when the JSX tree is built, not reactively. For reactive condition use `when(cond, () => <X/>)` from @granularjs/core.',
    docs: 'See granular-jsx/README.md - "Reactive conditionals".',
  },
  create(context) {
    return {
      JSXExpressionContainer(path) {
        const expr = path.node.expression;
        if (!expr) return;
        if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
          if (!isReactiveCallExpression(expr.left)) return;
          const right = expr.right;
          if (right && (right.type === 'JSXElement' || right.type === 'JSXFragment')) {
            context.report({
              node: expr,
              message: `\`{cond && <X/>}\` does not react to "${context.source.slice(expr.left.start, expr.left.end)}". Use \`{when(${context.source.slice(expr.left.start, expr.left.end)}, () => <X/>)}\` for reactive show/hide.`,
            });
          }
        }
        if (expr.type === 'ConditionalExpression') {
          if (!isReactiveCallExpression(expr.test)) return;
          const looksJsx = (n) => n && (n.type === 'JSXElement' || n.type === 'JSXFragment');
          if (looksJsx(expr.consequent) || looksJsx(expr.alternate)) {
            context.report({
              node: expr,
              message: `JSX ternary on a reactive condition is built once and won't update. Use \`{when(${context.source.slice(expr.test.start, expr.test.end)}, () => <true>, () => <false>)}\`.`,
            });
          }
        }
      },
    };
  },
};
