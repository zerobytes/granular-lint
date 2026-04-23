'use strict';

module.exports = {
  id: 'jsx-no-children-get-snapshot',
  meta: {
    severity: 'warning',
    jsxOnly: true,
    description:
      'Inside JSX expression containers, `{state.get()}` reads the value once and never updates. Pass the reactive source itself: `{state}` (or `{after(state).compute(...)}` for derived values).',
    docs: 'See granular-jsx/README.md - "Reactive children".',
  },
  create(context) {
    const reactiveLocals = new Set();

    function recordDecl(decl) {
      if (!decl || decl.type !== 'VariableDeclarator') return;
      const init = decl.init;
      if (!init || init.type !== 'CallExpression' || !init.callee || init.callee.type !== 'Identifier') return;
      const name = init.callee.name;
      if (['state', 'signal', 'computed', 'derive', 'persist'].includes(name)) {
        if (decl.id && decl.id.type === 'Identifier') reactiveLocals.add(decl.id.name);
      }
    }

    function reactiveGetRoot(node) {
      if (!node || node.type !== 'CallExpression') return null;
      const callee = node.callee;
      if (!callee || callee.type !== 'MemberExpression') return null;
      if (!callee.property || callee.property.type !== 'Identifier' || callee.property.name !== 'get') return null;
      if (node.arguments.length > 0) return null;
      let cur = callee.object;
      while (cur && cur.type === 'MemberExpression') cur = cur.object;
      if (cur && cur.type === 'Identifier' && reactiveLocals.has(cur.name)) return cur.name;
      return null;
    }

    return {
      VariableDeclaration(path) {
        for (const d of path.node.declarations) recordDecl(d);
      },
      JSXExpressionContainer(path) {
        const expr = path.node.expression;
        const root = reactiveGetRoot(expr);
        if (!root) return;
        context.report({
          node: expr,
          message: `\`{${root}.get()}\` reads "${root}" only once. Pass the reactive source itself: \`{${root}}\`. Granular will keep the DOM in sync.`,
        });
      },
    };
  },
};
