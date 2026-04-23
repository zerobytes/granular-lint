'use strict';

const { getCalleeName, isArrowOrFunctionExpr } = require('../utils/ast');

module.exports = {
  id: 'match-arrow-functions',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      '`match(sources, predicate, renderTrue, renderFalse?)` requires `predicate`, `renderTrue` and (when present) `renderFalse` to be functions. Passing the result of a call evaluates it eagerly, defeating the conditional.',
    docs: 'See granular/src/core/dom/match.js - throws if any of these is not a function.',
  },
  create(context) {
    return {
      CallExpression(path) {
        const calleeName = getCalleeName(path.node);
        if (calleeName !== 'match') return;
        const args = path.node.arguments;
        // Validate args[1] (predicate), args[2] (renderTrue), args[3] (renderFalse, optional).
        const labels = { 1: 'predicate', 2: 'renderTrue', 3: 'renderFalse' };
        for (let i = 1; i <= 3; i++) {
          const arg = args[i];
          if (arg === undefined) continue;
          if (i === 3 && (arg.type === 'NullLiteral' || (arg.type === 'Identifier' && arg.name === 'undefined'))) continue;
          if (isArrowOrFunctionExpr(arg)) continue;
          if (arg.type === 'Identifier') continue; // bare reference is acceptable
          if (arg.type === 'CallExpression') {
            context.report({
              node: arg,
              message: `\`match()\` ${labels[i]} is a CallExpression - it executes immediately. Wrap it: \`() => ${context.source.slice(arg.start, arg.end)}\`.`,
            });
            continue;
          }
          if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
            context.report({
              node: arg,
              message: `\`match()\` ${labels[i]} is a JSX expression evaluated eagerly. Wrap it: \`() => (${context.source.slice(arg.start, arg.end)})\`.`,
            });
          }
        }
      },
    };
  },
};
