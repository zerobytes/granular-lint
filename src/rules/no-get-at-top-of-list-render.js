'use strict';

const { getCalleeName } = require('../utils/ast');

function isListRenderFn(arrowPath) {
  const parent = arrowPath.parentPath;
  if (!parent || parent.node.type !== 'CallExpression') return false;
  const calleeName = getCalleeName(parent.node);
  if (calleeName !== 'list' && calleeName !== 'virtualList') return false;
  const args = parent.node.arguments;
  const idx = args.indexOf(arrowPath.node);
  return idx === 1 || idx === 2;
}

function getRenderFnParamNames(fn) {
  const params = fn.params || [];
  const out = [];
  if (params[0] && params[0].type === 'Identifier') out.push(params[0].name);
  if (params[1] && params[1].type === 'Identifier') out.push(params[1].name);
  return out;
}

function bodyTopLevelStatements(fn) {
  if (!fn.body) return [];
  if (fn.body.type === 'BlockStatement') return fn.body.body || [];
  return [fn.body];
}

function memberRootIdentifier(node) {
  let cur = node;
  while (cur && cur.type === 'MemberExpression') cur = cur.object;
  return cur && cur.type === 'Identifier' ? cur : null;
}

function findGetCallOnNames(node, names) {
  if (!node) return null;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (
      callee &&
      callee.type === 'MemberExpression' &&
      callee.property &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'get' &&
      !callee.computed
    ) {
      const root = memberRootIdentifier(callee.object);
      if (root && names.includes(root.name)) return { node, name: root.name };
    }
  }
  if (node.type === 'OptionalCallExpression') {
    return findGetCallOnNames(
      Object.assign({}, node, { type: 'CallExpression' }),
      names,
    );
  }
  return null;
}

function collectIdentifierNamesInExpression(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectIdentifierNamesInExpression(n, out);
    return;
  }
  if (node.type === 'Identifier') {
    out.add(node.name);
    return;
  }
  // Skip nested function bodies when collecting names from an init expression
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration'
  ) {
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    const child = node[key];
    if (child && typeof child === 'object') collectIdentifierNamesInExpression(child, out);
  }
}

function findRenderPositionUse(node, taintedNames, skipNodes) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findRenderPositionUse(n, taintedNames, skipNodes);
      if (found) return found;
    }
    return null;
  }
  if (skipNodes && skipNodes.has(node)) return null;
  if (node.type === 'Identifier') {
    if (taintedNames.has(node.name)) return node;
    return null;
  }
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'ObjectMethod' ||
    node.type === 'ClassMethod'
  ) {
    return null;
  }
  if (node.type === 'VariableDeclarator') {
    return findRenderPositionUse(node.init, taintedNames, skipNodes);
  }
  if (node.type === 'AssignmentExpression') {
    return findRenderPositionUse(node.right, taintedNames, skipNodes);
  }
  if (node.type === 'MemberExpression' && node.computed === false && node.property && node.property.type === 'Identifier') {
    // For `obj.prop`, only `obj` may reference a binding; `prop` is a label.
    return findRenderPositionUse(node.object, taintedNames, skipNodes);
  }
  if (node.type === 'ObjectProperty' || node.type === 'Property') {
    return findRenderPositionUse(node.value, taintedNames, skipNodes);
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    const child = node[key];
    if (child && typeof child === 'object') {
      const found = findRenderPositionUse(child, taintedNames, skipNodes);
      if (found) return found;
    }
  }
  return null;
}

module.exports = {
  id: 'no-get-at-top-of-list-render',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Calling `.get()` on the item/index parameters at the top of a list() render function takes a one-time snapshot and kills reactivity. Bind the state path directly into the DOM instead.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - Anti-Patterns: "DON\'T: Call .get() at the Top of list() Render Functions".',
  },
  create(context) {
    return {
      'ArrowFunctionExpression|FunctionExpression'(path) {
        if (!isListRenderFn(path)) return;
        const paramNames = getRenderFnParamNames(path.node);
        if (paramNames.length === 0) return;

        const stmts = bodyTopLevelStatements(path.node);
        const tainted = new Set();
        const skipNodes = new Set();
        const reports = [];

        for (const stmt of stmts) {
          if (stmt.type === 'VariableDeclaration') {
            for (const d of stmt.declarations) {
              if (!d.init) continue;
              const bad = findGetCallOnNames(d.init, paramNames);
              if (bad) {
                if (d.id && d.id.type === 'Identifier') tainted.add(d.id.name);
                skipNodes.add(d.init);
                reports.push({
                  node: bad.node,
                  paramName: bad.name,
                  varName: d.id && d.id.type === 'Identifier' ? d.id.name : null,
                });
                continue;
              }
              if (d.id && d.id.type === 'Identifier' && tainted.size > 0) {
                const refs = new Set();
                collectIdentifierNamesInExpression(d.init, refs);
                let derived = false;
                for (const r of refs) {
                  if (tainted.has(r)) {
                    derived = true;
                    break;
                  }
                }
                if (derived) {
                  tainted.add(d.id.name);
                  skipNodes.add(d.init);
                }
              }
            }
          } else if (stmt.type === 'ExpressionStatement') {
            const bad = findGetCallOnNames(stmt.expression, paramNames);
            if (bad) {
              reports.push({ node: bad.node, paramName: bad.name, varName: null });
            }
          }
        }

        if (reports.length === 0) return;

        for (const rep of reports) {
          let fire = true;
          if (rep.varName) {
            const used = findRenderPositionUse(path.node.body, tainted, skipNodes);
            if (!used) fire = false;
          }
          if (!fire) continue;
          context.report({
            node: rep.node,
            message: rep.varName
              ? `\`${rep.paramName}.get()\` is called at the top of a list() render function. This takes a one-time snapshot and breaks reactivity. Use the reactive path directly (e.g. \`Span(${rep.paramName}.name)\`); only call \`.get()\` inside event closures.`
              : `Top-level \`${rep.paramName}.get()\` inside list() render function returns a static value and breaks reactivity. Bind the reactive path directly into the DOM instead.`,
          });
        }
      },
    };
  },
};
