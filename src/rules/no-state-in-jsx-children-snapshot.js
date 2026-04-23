'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

function isInTagCallChild(path) {
  let cur = path && path.parentPath;
  while (cur) {
    const n = cur.node;
    if (!n) return false;
    if (n.type === 'CallExpression') {
      const callee = n.callee;
      if (callee && callee.type === 'Identifier' && (GRANULAR_TAG_NAMES.has(callee.name) || /^[A-Z]/.test(callee.name))) {
        // Make sure we're a positional arg, not the callee itself
        if (n.arguments.includes(path.node) || n.arguments.some((a) => a === path.node)) {
          return true;
        }
        // Also check parent path-level
        if (n.arguments.includes(cur.node)) return true;
      }
    }
    cur = cur.parentPath;
  }
  return false;
}

module.exports = {
  id: 'no-state-in-jsx-children-snapshot',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Calling `.get()` on a state/signal directly inside a tag-call child or JSX expression takes a one-time snapshot and never updates. Bind the reactive source itself instead.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Reactivity / "{count.get()} gives a one-time read".',
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

    function isReactiveGetCall(node) {
      if (!node || node.type !== 'CallExpression') return null;
      const callee = node.callee;
      if (!callee || callee.type !== 'MemberExpression') return null;
      if (!callee.property || callee.property.type !== 'Identifier' || callee.property.name !== 'get') return null;
      let cur = callee.object;
      while (cur && cur.type === 'MemberExpression') cur = cur.object;
      if (cur && cur.type === 'Identifier' && reactiveLocals.has(cur.name)) return cur.name;
      return null;
    }

    return {
      VariableDeclaration(path) {
        for (const d of path.node.declarations) recordDecl(d);
      },
      CallExpression(path) {
        const root = isReactiveGetCall(path.node);
        if (!root) return;
        if (!isInTagCallChild(path)) return;
        context.report({
          node: path.node,
          message: `\`${root}.get()\` inside a tag/JSX child takes a one-time snapshot. Pass the reactive source itself (e.g. \`Span(${root})\`) so the DOM updates when it changes.`,
        });
      },
    };
  },
};
