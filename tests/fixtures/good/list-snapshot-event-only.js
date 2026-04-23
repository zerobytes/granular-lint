import { state, list, observableArray, after, Div, Span, Checkbox } from '@granularjs/core';

const users = observableArray([{ id: 1, userType: 'operator', name: 'a' }]);
const selectedUserIds = state([]);

const toggleUserSelection = (id) => {
  const cur = selectedUserIds.get();
  if (cur.includes(id)) selectedUserIds.set(cur.filter((x) => x !== id));
  else selectedUserIds.set([...cur, id]);
};

export const UsersList = () =>
  Div(
    list(users, (user) => {
      const u = user.get();
      const id = u?.id ?? '';
      return Div(
        { onClick: () => toggleUserSelection(id) },
        after(selectedUserIds).compute((ids) =>
          Span(ids.includes(id) ? 'selected' : 'not'),
        ),
        Span(user.name),
      );
    }),
  );
