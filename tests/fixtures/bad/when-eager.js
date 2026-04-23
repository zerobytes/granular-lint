import { state, when, Div } from '@granularjs/core';

const Heavy = () => Div('heavy');

const App = () => {
  const open = state(false);
  return Div(
    when(open, Heavy(), null),
    when(open, Heavy()),
  );
};

export { App };
