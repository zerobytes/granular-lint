import { state, Div, Span } from '@granularjs/core';

export const Page = () => {
  const open = state(false);
  const user = state({ name: 'Ana' });

  return Div(
    open && Span('shown'),
    open ? Span('A') : Span('B'),
    user.name && Span('has name'),
  );
};
