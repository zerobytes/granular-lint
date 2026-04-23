'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');
const { startsWithCapital } = require('../utils/ast');

function isTagOrComponentCall(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (!callee) return false;
  if (callee.type === 'Identifier') {
    if (GRANULAR_TAG_NAMES.has(callee.name)) return true;
    if (startsWithCapital(callee.name)) return true;
  }
  if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier') {
    if (startsWithCapital(callee.property.name)) return true;
  }
  return false;
}

function countRenderableChildren(callNode) {
  // Count the renderable children/descendants in the immediate args (depth 2)
  // and recursively in nested tag/component calls.
  let count = 0;
  if (!Array.isArray(callNode.arguments)) return 0;
  for (const arg of callNode.arguments) {
    count += countRenderablesInExpr(arg);
  }
  return count;
}

function countRenderablesInExpr(node, depth = 0) {
  if (!node || depth > 6) return 0;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return 1 + countJsxChildren(node);
  if (node.type === 'CallExpression' && isTagOrComponentCall(node)) {
    return 1 + countRenderableChildren(node);
  }
  if (node.type === 'SpreadElement' || node.type === 'SpreadProperty') {
    return countRenderablesInExpr(node.argument, depth + 1);
  }
  if (node.type === 'ArrayExpression') {
    let total = 0;
    for (const el of node.elements || []) total += countRenderablesInExpr(el, depth + 1);
    return total;
  }
  if (node.type === 'ConditionalExpression') {
    return Math.max(
      countRenderablesInExpr(node.consequent, depth + 1),
      countRenderablesInExpr(node.alternate, depth + 1),
    );
  }
  if (node.type === 'LogicalExpression') {
    return Math.max(
      countRenderablesInExpr(node.left, depth + 1),
      countRenderablesInExpr(node.right, depth + 1),
    );
  }
  return 0;
}

function countJsxChildren(jsx) {
  let count = 0;
  for (const child of jsx.children || []) {
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      count += 1 + countJsxChildren(child);
    } else if (child.type === 'JSXExpressionContainer') {
      count += countRenderablesInExpr(child.expression);
    }
  }
  return count;
}

function getReturnExpression(fn) {
  if (!fn || (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression')) return null;
  if (!fn.body) return null;
  if (fn.body.type === 'BlockStatement') {
    for (const stmt of fn.body.body) {
      if (stmt.type === 'ReturnStatement') return stmt.argument;
    }
    return null;
  }
  return fn.body;
}

const MIN_RENDERABLE_NODES = 3;

module.exports = {
  id: 'no-compute-returning-tree',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Returning a multi-node DOM/JSX tree from `after(x).compute(...)` rebuilds and remounts the entire subtree on every change. Render the structure once and bind individual leaves with state paths, `when()`, and `list()` for fine-grained updates.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "Don\'t Wrap Whole Subtrees in `after().compute()`".',
  },
  create(context) {
    return {
      CallExpression(path) {
        const node = path.node;
        const callee = node.callee;
        if (
          !callee ||
          callee.type !== 'MemberExpression' ||
          !callee.property ||
          callee.property.type !== 'Identifier' ||
          callee.property.name !== 'compute'
        ) {
          return;
        }
        const fn = node.arguments[0];
        const returned = getReturnExpression(fn);
        if (!returned) return;
        const count = countRenderablesInExpr(returned);
        if (count < MIN_RENDERABLE_NODES) return;
        context.report({
          node: returned,
          message: `\`compute()\` is returning a tree with ${count}+ renderable nodes. Each change rebuilds and remounts the whole subtree. Render the structure once and let individual leaves bind reactively (state paths, \`when(...)\`, \`list(...)\`); use \`compute()\` only for primitive/derived values or single leaf nodes.`,
        });
      },
    };
  },
};
