'use strict';

function arrowReturnsJSX(arg) {
  if (!arg) return false;
  if (arg.type !== 'ArrowFunctionExpression' && arg.type !== 'FunctionExpression') return false;
  if (!arg.body) return false;
  if (arg.body.type === 'JSXElement' || arg.body.type === 'JSXFragment') return true;
  if (arg.body.type === 'BlockStatement') {
    for (const stmt of arg.body.body) {
      if (stmt.type === 'ReturnStatement' && stmt.argument && (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  id: 'jsx-no-array-map',
  meta: {
    severity: 'warning',
    jsxOnly: true,
    description:
      'In Granular, `{items.map(x => <Row/>)}` is a static, one-time array of nodes. Use `{list(items, (x) => <Row/>)}` to get patch-based reactive rendering when the source array changes.',
    docs: 'See granular-jsx/README.md - "Reactive lists".',
  },
  create(context) {
    return {
      JSXExpressionContainer(path) {
        const expr = path.node.expression;
        if (!expr || expr.type !== 'CallExpression') return;
        const callee = expr.callee;
        if (!callee || callee.type !== 'MemberExpression') return;
        if (!callee.property || callee.property.type !== 'Identifier' || callee.property.name !== 'map') return;
        if (!context.isMemberRootReactive(callee.object, path)) return;
        const fn = expr.arguments[0];
        if (!arrowReturnsJSX(fn)) return;
        const src = context.source.slice(callee.object.start, callee.object.end);
        context.report({
          node: expr,
          message: `\`.map()\` over "${src}" produces a static node list and won't update when the array changes. Use \`list(${src}, (x) => <Row/>)\` from @granularjs/core for fine-grained reactive rendering.`,
        });
      },
    };
  },
};
