import { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { Div } from '@granularjs/core';

const App = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {}, []);
  const m = useMemo(() => 1, []);
  const cb = useCallback(() => {}, []);
  const r = useRef(null);
  const ctx = useContext({});
  return Div(count);
};

export { App };
