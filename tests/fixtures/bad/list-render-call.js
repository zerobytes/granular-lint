import { list, observableArray, Div } from '@granularjs/core';

const items = observableArray([1, 2, 3]);

const App = () =>
  Div(
    list(items, Div('eager-render')),
  );

export { App };
