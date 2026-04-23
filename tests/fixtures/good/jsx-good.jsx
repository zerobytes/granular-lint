import { state, signal, when, list, after } from '@granularjs/core';

const Page = () => {
  const open = state(false);
  const items = signal([{ id: 1, name: 'a' }]);
  const count = state(0);

  return (
    <div>
      {when(open, () => <span>visible</span>, () => <span>hidden</span>)}
      {list(items, (it) => <li>{it.name}</li>)}
      <span>{count}</span>
      <span>{after(count).compute((n) => n * 2)}</span>
    </div>
  );
};

export { Page };
