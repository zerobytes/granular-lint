import { Div, Span } from '@granularjs/core';
import { Card, Stack, Text, Group, Badge } from '@granularjs/ui';

export const Page = () =>
  Card({},
    Stack({},
      Text({}, 'Hello'),
      Group({},
        Badge({}, 'tag'),
      ),
    ),
    Div({}, Span('inner')),
  );
