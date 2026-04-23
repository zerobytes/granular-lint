'use strict';

const { GRANULAR_TAG_NAMES } = require('../utils/granular-imports');

function isAfterCall(node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    (node.callee.name === 'after' || node.callee.name === 'before')
  );
}

function isComputeOrChange(callee) {
  return (
    callee &&
    callee.type === 'MemberExpression' &&
    callee.property &&
    callee.property.type === 'Identifier' &&
    (callee.property.name === 'compute' || callee.property.name === 'change')
  );
}

function getAfterArgsAsIdentifiers(afterCall) {
  if (!afterCall || !Array.isArray(afterCall.arguments)) return [];
  const out = [];
  for (const a of afterCall.arguments) {
    if (a.type === 'Identifier') out.push(a.name);
  }
  return out;
}

function arrowReturnsRenderable(arrowOrFn) {
  if (!arrowOrFn) return false;
  let body = arrowOrFn.body;
  if (!body) return false;
  if (body.type === 'BlockStatement') {
    for (const stmt of body.body) {
      if (stmt.type === 'ReturnStatement' && isRenderableExpr(stmt.argument)) return true;
    }
    return false;
  }
  return isRenderableExpr(body);
}

function isRenderableExpr(node) {
  if (!node) return false;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
    if (GRANULAR_TAG_NAMES.has(node.callee.name)) return true;
    if (/^[A-Z]/.test(node.callee.name)) return true;
  }
  return false;
}

module.exports = {
  id: 'prefer-list-inside-compute',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description:
      'Calling `array.map(item => Tag(...))` inside `after(arr).compute((arr) => ...)` rebuilds and remounts every node every time the array changes. Use `list(arr, (item) => Tag(...))` for fine-grained patch-based updates (insert/remove/replace per item).',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "Lists - list()" / "Don\'t Wrap Whole Subtrees in after().compute()".',
  },
  create(context) {
    return {
      CallExpression(path) {
        const node = path.node;
        const callee = node.callee;
        if (!isComputeOrChange(callee)) return;
        if (callee.property.name !== 'compute') return;
        const afterCall = callee.object;
        if (!isAfterCall(afterCall)) return;

        const afterArgNames = getAfterArgsAsIdentifiers(afterCall);
        if (afterArgNames.length === 0) return;

        const computeFn = node.arguments[0];
        if (
          !computeFn ||
          (computeFn.type !== 'ArrowFunctionExpression' && computeFn.type !== 'FunctionExpression')
        ) {
          return;
        }

        // Map after() argument identifier names to the parameter names used
        // inside the compute callback (positional). after() can pass a single
        // value (one arg) or an array (multiple args).
        const params = computeFn.params || [];
        const paramNameToAfterIndex = new Map();
        if (afterArgNames.length === 1 && params[0] && params[0].type === 'Identifier') {
          paramNameToAfterIndex.set(params[0].name, 0);
        } else if (afterArgNames.length > 1 && params[0]) {
          if (params[0].type === 'ArrayPattern') {
            for (let i = 0; i < params[0].elements.length; i++) {
              const el = params[0].elements[i];
              if (el && el.type === 'Identifier') paramNameToAfterIndex.set(el.name, i);
            }
          }
        }

        if (paramNameToAfterIndex.size === 0) return;

        // Walk the compute body looking for `<param>.map(item => ...)` calls
        // where <param> is one of the mapped parameter names AND the map's
        // arrow returns a renderable.
        let found = null;

        function walk(n) {
          if (found || !n || typeof n !== 'object') return;
          if (Array.isArray(n)) {
            for (const c of n) walk(c);
            return;
          }
          if (
            n.type === 'CallExpression' &&
            n.callee &&
            n.callee.type === 'MemberExpression' &&
            n.callee.property &&
            n.callee.property.type === 'Identifier' &&
            n.callee.property.name === 'map' &&
            n.callee.object &&
            n.callee.object.type === 'Identifier' &&
            paramNameToAfterIndex.has(n.callee.object.name)
          ) {
            const fn = n.arguments[0];
            if (arrowReturnsRenderable(fn)) {
              const afterIdx = paramNameToAfterIndex.get(n.callee.object.name);
              const sourceName = afterArgNames[afterIdx];
              found = { node: n, sourceName, paramName: n.callee.object.name };
              return;
            }
          }
          // Don't descend into nested `after(...).compute(...)` calls; they
          // will be handled on their own visit.
          if (
            n.type === 'CallExpression' &&
            isComputeOrChange(n.callee) &&
            n !== node
          ) {
            return;
          }
          for (const key of Object.keys(n)) {
            if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
            const child = n[key];
            if (child && typeof child === 'object') walk(child);
          }
        }

        walk(computeFn.body);

        if (!found) return;

        context.report({
          node: found.node,
          message: `\`${found.paramName}.map(...)\` inside \`after(${found.sourceName}).compute(...)\` rebuilds the entire node list whenever \`${found.sourceName}\` changes. Use \`list(${found.sourceName}, (item) => ...)\` for patch-based updates (insert/remove/replace per item) instead.`,
        });
      },
    };
  },
};
