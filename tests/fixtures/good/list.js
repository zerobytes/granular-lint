import { list, observableArray, after, Div, Span, Button, Ul, Li } from '@granularjs/core';

const todos = observableArray([{ id: 1, text: 'a', done: false }]);

const App = () =>
  Ul(
    list(todos, (todo, index) =>
      Li(
        Span(index),
        Span(' - '),
        Span(todo.text),
        Span(after(todo.done).compute((d) => (d ? ' ✓' : ''))),
        Button(
          { onClick: () => todo.set().done = !todo.done.get() },
          'Toggle',
        ),
      ),
    ),
  );

export { App };
