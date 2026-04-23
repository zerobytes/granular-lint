'use strict';

const { getCalleeName, isArrowOrFunctionExpr, isLiteral } = require('../utils/ast');

module.exports = {
  id: 'when-arrow-functions',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      '`when(condition, renderTrue, renderFalse)` requires both branches to be functions. Passing the result of calling a component (e.g. `Modal()`) executes it eagerly, defeating the conditional.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "Conditional Rendering - IMPORTANT: Always Use Arrow Functions in when()".',
  },
  create(context) {
    return {
      CallExpression(path) {
        const calleeName = getCalleeName(path.node);
        if (calleeName !== 'when') return;
        const args = path.node.arguments;

        // condition is args[0]; renderTrue=args[1], renderFalse=args[2] (optional).
        for (let i = 1; i <= 2; i++) {
          const arg = args[i];
          if (arg === undefined) continue;
          if (isArrowOrFunctionExpr(arg)) continue;
          if (isLiteral(arg, null)) continue;
          if (arg.type === 'NullLiteral') continue;
          if (arg.type === 'Identifier' && arg.name === 'undefined') continue;
          // A bare identifier like `MyComp` (no call) is acceptable - when() will invoke it.
          if (arg.type === 'Identifier') continue;
          // A CallExpression here is wrong: it executes immediately.
          if (arg.type === 'CallExpression') {
            context.report({
              node: arg,
              message: `Branch ${i === 1 ? 'true' : 'false'} of when() is a CallExpression - the function runs immediately regardless of the condition. Wrap it: \`() => ${context.source.slice(arg.start, arg.end)}\`.`,
            });
            continue;
          }
          // Other expressions (like JSX) cause similar bugs.
          if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
            context.report({
              node: arg,
              message: `Branch ${i === 1 ? 'true' : 'false'} of when() is a JSX expression evaluated eagerly. Wrap it: \`() => (${context.source.slice(arg.start, arg.end)})\`.`,
            });
          }
        }
      },
    };
  },
};
