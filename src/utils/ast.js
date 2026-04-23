'use strict';

function getCalleeName(node) {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee;
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier' && !callee.computed) {
    return callee.property.name;
  }
  return null;
}

function getMemberRoot(node) {
  let cur = node;
  while (cur && cur.type === 'MemberExpression') cur = cur.object;
  return cur;
}

function getMemberChain(node) {
  const parts = [];
  let cur = node;
  while (cur && cur.type === 'MemberExpression') {
    if (cur.property && cur.property.type === 'Identifier' && !cur.computed) {
      parts.unshift(cur.property.name);
    } else {
      parts.unshift('[computed]');
    }
    cur = cur.object;
  }
  if (cur && cur.type === 'Identifier') parts.unshift(cur.name);
  return parts;
}

function isArrowOrFunctionExpr(node) {
  return !!node && (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression');
}

function isLiteral(node, value) {
  if (!node) return false;
  if (node.type === 'NullLiteral') return value === null;
  if (node.type === 'BooleanLiteral') return node.value === value;
  if (node.type === 'NumericLiteral' || node.type === 'StringLiteral') return node.value === value;
  if (node.type === 'Literal') return node.value === value;
  return false;
}

function isReactiveCall(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const name = getCalleeName(node);
  return ['state', 'signal', 'computed', 'derive', 'persist', 'observableArray'].includes(name);
}

function findEnclosingFunction(path) {
  let current = path && path.parentPath;
  while (current) {
    const t = current.node && current.node.type;
    if (
      t === 'FunctionDeclaration' ||
      t === 'FunctionExpression' ||
      t === 'ArrowFunctionExpression' ||
      t === 'ObjectMethod' ||
      t === 'ClassMethod'
    ) {
      return current;
    }
    current = current.parentPath;
  }
  return null;
}

function startsWithCapital(name) {
  return typeof name === 'string' && /^[A-Z]/.test(name);
}

module.exports = {
  getCalleeName,
  getMemberRoot,
  getMemberChain,
  isArrowOrFunctionExpr,
  isLiteral,
  isReactiveCall,
  findEnclosingFunction,
  startsWithCapital,
};
