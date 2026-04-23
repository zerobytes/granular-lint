import { state, Div, Span, Button, when, after } from '@granularjs/core';

const Counter = () => {
  const count = state(0);
  const user = state({ name: 'Ana', age: 25 });

  user.set().name = 'Maria';
  user.set('age', 30);

  return Div(
    Span('Count: ', count),
    Span(after(count).compute((n) => n * 2)),
    when(count, () => Span('non-zero'), () => null),
    Button({ onClick: () => count.set(count.get() + 1) }, '+'),
  );
};

export { Counter };
