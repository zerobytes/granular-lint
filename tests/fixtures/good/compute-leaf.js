import { state, after, Span } from '@granularjs/core';

const count = state(0);
const status = state('idle');

export const Leaves = () =>
  Span(
    after(count).compute((c) => `count: ${c * 2}`),
    after(status).compute((s) => Span(s)),
    after(count).compute((c) => c > 0 && Span('positive')),
  );
