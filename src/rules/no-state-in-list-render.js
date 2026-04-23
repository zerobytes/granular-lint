'use strict';

const { getCalleeName, isArrowOrFunctionExpr } = require('../utils/ast');

const REACTIVE_FACTORIES = new Set(['state', 'signal', 'observableArray']);

function findEnclosingListRender(path) {
  let current = path && path.parentPath;
  while (current) {
    const parent = current.parentPath;
    if (!parent) break;
    if (
      parent.node &&
      parent.node.type === 'CallExpression' &&
      isArrowOrFunctionExpr(current.node)
    ) {
      const calleeName = getCalleeName(parent.node);
      if (calleeName === 'list' || calleeName === 'virtualList') {
        const args = parent.node.arguments;
        const idx = args.indexOf(current.node);
        if (idx === 1 || idx === 2) return parent;
      }
    }
    current = parent;
  }
  return null;
}

module.exports = {
  id: 'no-state-in-list-render',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      'Do not call `state()` / `signal()` / `observableArray()` inside the render function passed to `list()`. The render function may be invoked many times (one per item, plus on resets) and each call would create new state, leaking memory and breaking continuity. Move the state into a per-item component.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Anti-Patterns: "DON\'T: Create State in Render Expressions".',
  },
  create(context) {
    return {
      CallExpression(path) {
        const calleeName = getCalleeName(path.node);
        if (!calleeName || !REACTIVE_FACTORIES.has(calleeName)) return;
        const enclosing = findEnclosingListRender(path);
        if (!enclosing) return;
        context.report({
          node: path.node,
          message: `\`${calleeName}()\` is called inside a list() render function. New reactive state would be created on each render. Move it to a stable per-item component (e.g. extract a function component).`,
        });
      },
    };
  },
};
