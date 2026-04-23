import { state, Div } from '@granularjs/core';

const Bad = () => {
  const x = state(0);
  return () => {
    x.set(1);
  };
};

export { Bad };
