'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

// Detect: when(cond, HeavyComponent(), null) — already covered by when-arrow-functions.
// Here we add a complementary check for misleading patterns like Div(when(cond, () => Card())) — no issue.
// Mostly we want to flag pattern: list(items, MyComp) -- passing a component reference is fine as long as MyComp expects (item, index).
// But: list(items, MyComp(...)) (called eagerly) is a bug.
module.exports = {
  id: 'no-component-call-as-tag-child',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Passing the result of a component call to `list(items, ...)` (i.e. `list(items, Render(item))`) executes the component once at build time and breaks per-item rendering. Pass an arrow/function reference: `list(items, (item) => Render(item))`.',
  },
  create(context) {
    return {
      CallExpression(path) {
        const callee = path.node.callee;
        if (!callee || callee.type !== 'Identifier') return;
        if (callee.name !== 'list' && callee.name !== 'virtualList') return;
        const renderArg = path.node.arguments[1];
        if (!renderArg) return;
        if (renderArg.type === 'CallExpression') {
          context.report({
            node: renderArg,
            message: `Render argument of \`${callee.name}()\` is a CallExpression. It will be evaluated once at build time. Pass an arrow function instead: \`(item, index) => ...\`.`,
          });
        }
      },
    };
  },
};
