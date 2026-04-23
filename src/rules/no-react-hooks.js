'use strict';

const { REACT_HOOKS } = require('../utils/granular-imports');

const SUGGESTIONS = {
  useState: 'Use `state(initial)` from @granularjs/core instead. Granular has no re-render: only DOM bindings update.',
  useEffect: 'Use `after(...targets).change(fn)` from @granularjs/core for side-effects on change. Mount logic goes directly in the component body (the function runs once).',
  useMemo: 'Use `after(...targets).compute(fn)` for derived reactive values.',
  useCallback: 'Granular components run once - regular functions/arrow functions are stable references and do not need memoization.',
  useRef: 'Use `state(null)` and the `node` prop on a tag (e.g. `Input({ node: ref })`) to capture the DOM element.',
  useContext: 'Use `context(defaultValue)` from @granularjs/core: `const ctx = context(...); ctx.scope(value).serve(child); ctx.state()`.',
  useReducer: 'Use `state()` plus simple action functions. Granular has no re-render to optimize away.',
  useLayoutEffect: 'Use `after(...).change(fn)` - effects run synchronously after the binding updates.',
  useImperativeHandle: 'Expose imperative APIs via the `node` prop or via plain object returns.',
  useSyncExternalStore: 'Wrap the external source in `signal()` / `state()` and bind it directly into the DOM.',
};

module.exports = {
  id: 'no-react-hooks',
  meta: {
    severity: 'error',
    description:
      'React hooks (useState/useEffect/useMemo/useCallback/useRef/useContext/...) are anti-patterns in Granular. Granular has no re-render and no dependency arrays.',
    docs: 'See granular/GRANULAR_AI_GUIDE.md - "Key Differences from React" / "Anti-Patterns".',
  },
  create(context) {
    const localToHook = new Map();

    function recordImport(source, local, imported) {
      if (REACT_HOOKS.has(imported)) localToHook.set(local, imported);
      if (source === 'react' && imported === 'default') localToHook.set(local + ':namespace', 'React');
    }

    return {
      ImportDeclaration(path) {
        const source = path.node.source && path.node.source.value;
        if (source !== 'react' && source !== 'preact/hooks') return;
        for (const spec of path.node.specifiers) {
          const local = spec.local && spec.local.name;
          if (!local) continue;
          const imported =
            spec.type === 'ImportSpecifier' ? spec.imported.name || spec.imported.value :
            spec.type === 'ImportDefaultSpecifier' ? 'default' : '*';
          recordImport(source, local, imported);
        }
      },
      CallExpression(path) {
        const callee = path.node.callee;
        if (!callee) return;

        let hookName = null;
        if (callee.type === 'Identifier') {
          hookName = localToHook.get(callee.name) || (REACT_HOOKS.has(callee.name) ? callee.name : null);
        } else if (
          callee.type === 'MemberExpression' &&
          callee.object && callee.object.type === 'Identifier' &&
          callee.property && callee.property.type === 'Identifier' &&
          REACT_HOOKS.has(callee.property.name)
        ) {
          hookName = callee.property.name;
        }
        if (!hookName) return;

        const suggestion = SUGGESTIONS[hookName] || 'Replace with the equivalent Granular reactive primitive.';
        context.report({
          node: path.node,
          message: `React hook "${hookName}" is not valid in Granular code. ${suggestion}`,
          suggestion,
        });
      },
    };
  },
};
