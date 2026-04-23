import { state, Div, Span } from '@granularjs/core';

const Counter = () => {
  const user = state({ name: 'Ana', age: 25 });

  user.name = 'Maria';
  user.value = 1;
  user.age++;

  return Div(Span(user.name));
};

export { Counter };
