'use strict';

function callsObservableArray(node) {
  if (!node) return false;
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee && callee.type === 'Identifier' && callee.name === 'observableArray') return true;
  // Wrappers: persist(observableArray(...)), persist(state(...)) etc.
  if (callee && callee.type === 'Identifier' && (callee.name === 'persist' || callee.name === 'state')) {
    for (const arg of node.arguments) {
      if (callsObservableArray(arg)) return true;
    }
  }
  return false;
}

module.exports = {
  id: 'no-array-index-assignment',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Assigning into an `observableArray` by index (e.g. `arr[0] = x`) bypasses the patch system. Use `arr.splice(i, 1, value)` (or `push`/`unshift`/etc.) so subscribers receive a patch.',
  },
  create(context) {
    const observableArrayLocals = new Set();

    function recordDecl(decl) {
      if (!decl || decl.type !== 'VariableDeclarator') return;
      if (!decl.id || decl.id.type !== 'Identifier') return;
      if (callsObservableArray(decl.init)) observableArrayLocals.add(decl.id.name);
    }

    return {
      VariableDeclaration(path) {
        for (const d of path.node.declarations) recordDecl(d);
      },
      AssignmentExpression(path) {
        const node = path.node;
        if (node.operator !== '=') return;
        const left = node.left;
        if (!left || left.type !== 'MemberExpression' || !left.computed) return;
        const obj = left.object;
        if (!obj || obj.type !== 'Identifier') return;
        if (!observableArrayLocals.has(obj.name)) return;
        context.report({
          node,
          message: `Direct index assignment on observableArray "${obj.name}" bypasses the patch subscription system. Use \`${obj.name}.splice(index, 1, value)\` (or another mutation method) so subscribers receive a patch.`,
        });
      },
    };
  },
};
