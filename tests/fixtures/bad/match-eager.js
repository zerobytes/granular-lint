import { state, match, Div, Span } from '@granularjs/core';

export const Page = () => {
  const status = state('loading');

  return Div(
    match(status, (s) => s === 'loading', Span('loading'), Span('done')),
  );
};
