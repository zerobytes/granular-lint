'use strict';

const traverseModule = require('@babel/traverse');
const traverse = traverseModule.default || traverseModule;
const t = require('@babel/types');

const { parseSource } = require('./parser');
const { loadRules } = require('./rules');
const {
  CORE_PACKAGES,
  JSX_PACKAGES,
  REACT_PACKAGES,
  GRANULAR_REACTIVE_FACTORIES,
  GRANULAR_TAG_NAMES,
} = require('./utils/granular-imports');

function createImportIndex(ast) {
  const index = {
    sources: new Map(),
    bindings: new Map(),
    reactiveLocals: new Set(),
    tagLocals: new Set(),
    reactiveBindingNodes: new WeakSet(),
    tagBindingNodes: new WeakSet(),
    isJsx: false,
  };

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const source = node.source && node.source.value;
    if (!source) continue;
    index.sources.set(source, node);

    for (const spec of node.specifiers) {
      const local = spec.local && spec.local.name;
      if (!local) continue;
      const imported =
        spec.type === 'ImportSpecifier'
          ? spec.imported.name || spec.imported.value
          : spec.type === 'ImportDefaultSpecifier'
            ? 'default'
            : '*';
      index.bindings.set(local, { source, imported, type: spec.type });

      if (CORE_PACKAGES.has(source)) {
        if (GRANULAR_REACTIVE_FACTORIES.has(imported)) {
          index.reactiveLocals.add(local);
          if (spec.local) index.reactiveBindingNodes.add(spec.local);
        }
        if (GRANULAR_TAG_NAMES.has(imported)) {
          index.tagLocals.add(local);
          if (spec.local) index.tagBindingNodes.add(spec.local);
        }
      }
    }
  }

  return index;
}

function isJsxFile(filePath, ast) {
  if (filePath && /\.(jsx|tsx)$/.test(filePath)) return true;
  let found = false;
  traverse(ast, {
    JSXElement() {
      found = true;
    },
    JSXFragment() {
      found = true;
    },
  });
  return found;
}

const REACTIVE_FACTORY_NAMES = new Set([
  'state',
  'signal',
  'computed',
  'derive',
  'persist',
  'observableArray',
]);

function collectReactiveLocals(ast, importIndex) {
  // Treat any local bound to a call of one of the reactive factories as reactive.
  // Also treat aliases of imported factories transitively (e.g. const s = state).
  const factoryAliases = new Set();
  for (const [local, info] of importIndex.bindings.entries()) {
    if (REACTIVE_FACTORY_NAMES.has(info.imported)) factoryAliases.add(local);
  }

  traverse(ast, {
    VariableDeclaration(path) {
      for (const d of path.node.declarations) {
        if (!d.id || d.id.type !== 'Identifier') continue;
        const init = d.init;
        if (!init) continue;
        if (init.type === 'CallExpression') {
          const callee = init.callee;
          let name = null;
          if (callee.type === 'Identifier') name = callee.name;
          else if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier') name = callee.property.name;
          if (!name) continue;
          if (factoryAliases.has(name) || REACTIVE_FACTORY_NAMES.has(name)) {
            importIndex.reactiveLocals.add(d.id.name);
            importIndex.reactiveBindingNodes.add(d.id);
          }
          // after(x).compute(...) => reactive
          if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier' && callee.property.name === 'compute') {
            importIndex.reactiveLocals.add(d.id.name);
            importIndex.reactiveBindingNodes.add(d.id);
          }
        }
      }
    },
  });
}

function makeIsReactiveIdentifier(importIndex) {
  return function isReactiveIdentifier(path, name) {
    if (!name) return false;
    if (path && path.scope && typeof path.scope.getBinding === 'function') {
      const binding = path.scope.getBinding(name);
      if (binding && binding.identifier) {
        return importIndex.reactiveBindingNodes.has(binding.identifier);
      }
      // No binding found - identifier might refer to a global; treat as
      // reactive only if the name was declared at module scope.
      if (binding === undefined && importIndex.reactiveLocals.has(name)) {
        return true;
      }
      return false;
    }
    return importIndex.reactiveLocals.has(name);
  };
}

function isMemberRootReactive(node, isReactiveIdentifier, path) {
  if (!node) return false;
  if (node.type === 'Identifier') return isReactiveIdentifier(path, node.name);
  if (node.type === 'MemberExpression') {
    let cur = node;
    while (cur && cur.type === 'MemberExpression') cur = cur.object;
    if (cur && cur.type === 'Identifier') return isReactiveIdentifier(path, cur.name);
  }
  return false;
}

function lintSource(source, filePath, options = {}) {
  const messages = [];
  let ast;
  try {
    ast = parseSource(source, filePath);
  } catch (err) {
    messages.push({
      filePath,
      ruleId: 'parse-error',
      severity: 'error',
      message: `Parse error: ${err.message}`,
      line: err.loc ? err.loc.line : 1,
      column: err.loc ? err.loc.column + 1 : 1,
    });
    return { filePath, source, messages };
  }

  const importIndex = createImportIndex(ast);
  collectReactiveLocals(ast, importIndex);
  const usingJsx = isJsxFile(filePath, ast);
  const usingCore =
    Array.from(importIndex.sources.keys()).some((src) => CORE_PACKAGES.has(src) || JSX_PACKAGES.has(src)) ||
    importIndex.tagLocals.size > 0 ||
    importIndex.reactiveLocals.size > 0;

  const isReactiveIdentifier = makeIsReactiveIdentifier(importIndex);

  const context = {
    filePath,
    source,
    ast,
    importIndex,
    usingJsx,
    usingCore,
    options,
    isReactiveIdentifier,
    isMemberRootReactive: (node, path) => isMemberRootReactive(node, isReactiveIdentifier, path),
    report({ node, ruleId, message, severity = 'error', suggestion }) {
      const loc = (node && node.loc && node.loc.start) || { line: 1, column: 0 };
      messages.push({
        filePath,
        ruleId,
        severity,
        message,
        line: loc.line,
        column: loc.column + 1,
        endLine: node && node.loc ? node.loc.end.line : loc.line,
        endColumn: node && node.loc ? node.loc.end.column + 1 : loc.column + 1,
        suggestion: suggestion || null,
      });
    },
  };

  const rules = loadRules(options);
  const visitorMap = new Map();

  for (const rule of rules) {
    if (rule.meta && rule.meta.jsxOnly && !usingJsx) continue;
    if (rule.meta && rule.meta.requiresGranular && !usingCore && !usingJsx) continue;
    const ctx = Object.assign({}, context, {
      report: (msg) =>
        context.report(Object.assign({}, msg, { ruleId: rule.id, severity: msg.severity || rule.meta.severity })),
      rule,
    });
    const visitor = rule.create(ctx) || {};
    for (const key of Object.keys(visitor)) {
      const handler = visitor[key];
      if (typeof handler !== 'function') continue;
      const expanded = key.split('|').map((k) => k.trim()).filter(Boolean);
      for (const k of expanded) {
        if (!visitorMap.has(k)) visitorMap.set(k, []);
        visitorMap.get(k).push(handler);
      }
    }
  }

  const merged = {};
  for (const [key, handlers] of visitorMap.entries()) {
    merged[key] = function (path) {
      for (const h of handlers) h.call(null, path);
    };
  }

  try {
    traverse(ast, merged);
  } catch (err) {
    messages.push({
      filePath,
      ruleId: 'traverse-error',
      severity: 'error',
      message: `Internal traverse error: ${err.message}`,
      line: 1,
      column: 1,
    });
  }

  messages.sort((a, b) => a.line - b.line || a.column - b.column);

  const filtered = applyInlineDisables(messages, source);
  return { filePath, source, messages: filtered };
}

function applyInlineDisables(messages, source) {
  if (!messages.length) return messages;
  const lines = source.split(/\r?\n/);
  const lineDisables = new Map(); // 1-based line → Set(ruleIds) | '*'
  const fileDisables = new Set();
  let fileDisableAll = false;

  function addDisable(map, line, ids) {
    let entry = map.get(line);
    if (!entry) {
      entry = new Set();
      map.set(line, entry);
    }
    if (ids === '*') entry.add('*');
    else for (const id of ids) entry.add(id);
  }

  function parseRuleList(rest) {
    if (!rest || !rest.trim()) return '*';
    return rest.split(',').map((s) => s.trim()).filter(Boolean);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fileMatch = line.match(/granular-lint-disable(?:-file)?\b\s*([^\n*\/]*)/);
    if (line.includes('granular-lint-disable-file')) {
      const m = line.match(/granular-lint-disable-file\b\s*([^\n*\/]*)/);
      const ids = parseRuleList(m && m[1]);
      if (ids === '*') fileDisableAll = true;
      else for (const id of ids) fileDisables.add(id);
      continue;
    }
    const nextLineMatch = line.match(/granular-lint-disable-next-line\b\s*([^\n*\/]*)/);
    if (nextLineMatch) {
      const ids = parseRuleList(nextLineMatch[1]);
      addDisable(lineDisables, i + 2, ids);
      continue;
    }
    const sameLineMatch = line.match(/granular-lint-disable-line\b\s*([^\n*\/]*)/);
    if (sameLineMatch) {
      const ids = parseRuleList(sameLineMatch[1]);
      addDisable(lineDisables, i + 1, ids);
    }
  }

  return messages.filter((m) => {
    if (fileDisableAll) return false;
    if (fileDisables.has(m.ruleId)) return false;
    const set = lineDisables.get(m.line);
    if (set && (set.has('*') || set.has(m.ruleId))) return false;
    return true;
  });
}

module.exports = { lintSource, createImportIndex };
