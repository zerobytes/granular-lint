import { state, signal, when } from '@granularjs/core';

const Page = () => {
  const open = state(false);
  const items = signal([{ id: 1, name: 'a' }]);
  const count = state(0);

  return (
    <div>
      {open && <span>visible</span>}
      {open ? <span>yes</span> : <span>no</span>}
      {items.map((it) => <li>{it.name}</li>)}
      <span>{count.get()}</span>
    </div>
  );
};

export { Page };
