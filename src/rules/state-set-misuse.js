'use strict';

const { getMemberRoot } = require('../utils/ast');

module.exports = {
  id: 'state-set-misuse',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Common misuses of the state/setter API: e.g. `state.value = x` instead of `state.set(x)`, or `state.set` (reading without calling).',
  },
  create(context) {
    const reactiveLocals = new Set();

    function recordDecl(decl) {
      if (!decl || decl.type !== 'VariableDeclarator') return;
      const init = decl.init;
      if (!init || init.type !== 'CallExpression' || !init.callee || init.callee.type !== 'Identifier') return;
      const name = init.callee.name;
      if (['state', 'signal', 'computed', 'derive', 'persist', 'observableArray'].includes(name)) {
        if (decl.id && decl.id.type === 'Identifier') reactiveLocals.add(decl.id.name);
      }
    }

    return {
      VariableDeclaration(path) {
        for (const d of path.node.declarations) recordDecl(d);
      },
      AssignmentExpression(path) {
        const node = path.node;
        if (node.operator !== '=') return;
        const left = node.left;
        if (!left || left.type !== 'MemberExpression') return;
        if (left.computed) return;
        const root = getMemberRoot(left);
        if (!root || root.type !== 'Identifier' || !reactiveLocals.has(root.name)) return;
        if (!left.property || left.property.type !== 'Identifier') return;
        if (left.property.name === 'value') {
          context.report({
            node,
            message: `\`${root.name}.value = ...\` does not update Granular state. Use \`${root.name}.set(value)\`.`,
          });
        }
      },
    };
  },
};
