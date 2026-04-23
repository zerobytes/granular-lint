'use strict';

const { startsWithCapital } = require('../utils/ast');

function isComponentDeclaration(path) {
  // Heuristic: PascalCase function/arrow assigned to a const, or function declaration.
  const node = path.node;
  if (node.type === 'FunctionDeclaration') {
    return !!(node.id && startsWithCapital(node.id.name));
  }
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    const parent = path.parentPath && path.parentPath.node;
    if (!parent) return false;
    if (parent.type === 'VariableDeclarator' && parent.id && parent.id.type === 'Identifier') {
      return startsWithCapital(parent.id.name);
    }
    if (parent.type === 'AssignmentExpression' && parent.left && parent.left.type === 'Identifier') {
      return startsWithCapital(parent.left.name);
    }
  }
  return false;
}

function returnsAFunction(node) {
  if (!node) return false;
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') return true;
  if (node.type === 'Identifier') return false; // can't tell statically; skip to avoid noise
  return false;
}

module.exports = {
  id: 'no-cleanup-return-from-component',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Granular components run once and have no useEffect-style cleanup mechanism. Returning a function from a component is almost always a React-style mistake; the function will be treated as a renderable and not invoked as cleanup.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Anti-Patterns: "DON\'T: Try to Return Cleanup Functions".',
  },
  create(context) {
    return {
      'FunctionDeclaration|ArrowFunctionExpression|FunctionExpression'(path) {
        if (!isComponentDeclaration(path)) return;
        const node = path.node;
        if (node.body && node.body.type === 'BlockStatement') {
          for (const stmt of node.body.body || []) {
            if (stmt.type === 'ReturnStatement' && returnsAFunction(stmt.argument)) {
              context.report({
                node: stmt,
                message: `Component appears to return a function. Granular has no cleanup hook - the function will not be invoked as cleanup. Return a renderable (tag call) instead.`,
              });
            }
          }
        } else if (returnsAFunction(node.body)) {
          // arrow with implicit body returning a function literal
          context.report({
            node: node.body,
            message: `Component returns a function literal. Granular has no cleanup hook - the function will not be invoked. Return a renderable (tag call) instead.`,
          });
        }
      },
    };
  },
};
