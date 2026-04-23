import { state, list, observableArray, Div, Span, Button } from '@granularjs/core';

const items = observableArray([{ id: 1, name: 'a', size: 'sm' }]);

const App = () =>
  Div(
    list(items, (item, index) => {
      const raw = item.get();
      const expanded = state(false);
      return Div(
        Span(raw.name),
        Span(item.size || 'md'),
        Button({ onClick: () => expanded.set(!expanded.get()) }, 'toggle'),
      );
    }),
  );

export { App };
