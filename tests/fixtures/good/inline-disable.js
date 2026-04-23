import { state, Div } from '@granularjs/core';

const Counter = () => {
  const user = state({ name: 'Ana' });

  // granular-lint-disable-next-line no-state-mutation
  user.name = 'Maria';

  user.age = 30; // granular-lint-disable-line no-state-mutation

  return Div(user.name);
};

export { Counter };
