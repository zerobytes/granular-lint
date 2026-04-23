'use strict';

const { getMemberRoot, getMemberChain } = require('../utils/ast');

module.exports = {
  id: 'no-state-mutation',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      'Granular state must not be mutated directly. Use `state.set(value)` or `state.set().path = value` (the setter proxy). Direct property assignment on a state/state-path throws at runtime.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Anti-Patterns: "DON\'T: Mutate State Directly".',
  },
  create(context) {
    const reactiveLocals = context.importIndex.reactiveLocals;
    const localFactories = context.importIndex.bindings;

    const reactiveBindings = new Set();

    function isReactiveCalleeName(name) {
      if (!name) return false;
      if (reactiveLocals.has(name)) return true;
      const binding = localFactories.get(name);
      if (binding && (binding.imported === 'state' || binding.imported === 'signal' || binding.imported === 'computed' || binding.imported === 'derive' || binding.imported === 'persist' || binding.imported === 'observableArray')) {
        return true;
      }
      return false;
    }

    function recordIfReactiveDecl(decl) {
      if (!decl || decl.type !== 'VariableDeclarator') return;
      const init = decl.init;
      if (!init || init.type !== 'CallExpression') return;
      const callee = init.callee;
      if (!callee) return;
      let name = null;
      if (callee.type === 'Identifier') name = callee.name;
      else if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier') name = callee.property.name;
      if (!isReactiveCalleeName(name)) return;
      if (decl.id && decl.id.type === 'Identifier') {
        reactiveBindings.add(decl.id.name);
      }
    }

    return {
      VariableDeclaration(path) {
        for (const d of path.node.declarations) recordIfReactiveDecl(d);
      },
      AssignmentExpression(path) {
        const node = path.node;
        if (node.operator !== '=' && node.operator !== '+=' && node.operator !== '-=' && node.operator !== '*=' && node.operator !== '/=' && node.operator !== '||=' && node.operator !== '&&=' && node.operator !== '??=') return;
        const left = node.left;
        if (!left || left.type !== 'MemberExpression') return;
        if (left.computed) return; // arr[i] = ... handled by no-array-index-assignment

        const root = getMemberRoot(left);
        if (!root || root.type !== 'Identifier') return;
        if (!reactiveBindings.has(root.name)) return;

        const chain = getMemberChain(left);
        if (chain.length < 2) return;
        if (chain[chain.length - 1] === 'set' || chain[chain.length - 1] === 'value') {
          // user.value = x is also wrong on a state. Allow if it's clearly inside a set() call chain.
        }
        // Detect if we're chained from a `.set()` proxy: user.set().name = x  →  acceptable.
        // In that case the parent left would be a CallExpression(set).
        // i.e. the MemberExpression's object eventually contains a CallExpression named `set`.
        let cur = left.object;
        let viaSetCall = false;
        while (cur) {
          if (cur.type === 'CallExpression') {
            const callee = cur.callee;
            if (callee && callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier' && callee.property.name === 'set') {
              viaSetCall = true;
              break;
            }
            cur = callee && callee.object ? callee.object : null;
          } else if (cur.type === 'MemberExpression') {
            cur = cur.object;
          } else {
            break;
          }
        }
        if (viaSetCall) return;

        context.report({
          node,
          message: `Direct mutation of reactive value "${root.name}". Use \`${root.name}.set(value)\` or \`${root.name}.set().path = value\`. Direct assignment will throw at runtime.`,
        });
      },
      UpdateExpression(path) {
        const arg = path.node.argument;
        if (!arg || arg.type !== 'MemberExpression') return;
        const root = getMemberRoot(arg);
        if (!root || root.type !== 'Identifier') return;
        if (!reactiveBindings.has(root.name)) return;
        context.report({
          node: path.node,
          message: `\`${path.node.operator}\` on reactive path "${root.name}" mutates state directly. Use \`${root.name}.set(${root.name}.get() ${path.node.operator === '++' ? '+ 1' : '- 1'})\`.`,
        });
      },
    };
  },
};
