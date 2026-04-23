'use strict';

module.exports = {
  id: 'after-targets',
  meta: {
    severity: 'error',
    requiresGranular: true,
    description:
      '`after(...targets)` and `before(...targets)` require at least one reactive target. Calling them with no arguments produces an observer that never fires.',
  },
  create(context) {
    const importedNames = new Set();
    for (const [local, info] of context.importIndex.bindings.entries()) {
      if ((info.imported === 'after' || info.imported === 'before') && /@granularjs\//.test(info.source)) {
        importedNames.add(local);
      }
    }

    return {
      CallExpression(path) {
        const callee = path.node.callee;
        // Only target plain identifier calls (not member calls like `target.after()`)
        if (!callee || callee.type !== 'Identifier') return;
        if (!importedNames.has(callee.name)) return;
        if (path.node.arguments.length === 0) {
          context.report({
            node: path.node,
            message: `\`${callee.name}()\` was called without any reactive targets. Pass at least one state/signal/computed: \`${callee.name}(value).change(fn)\`.`,
          });
        }
      },
    };
  },
};
