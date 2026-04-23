import { state, after, Div, Span } from '@granularjs/core';
import { Card, Stack, Text, Badge } from '@granularjs/ui';

export const ImpactReadOnly = () => {
  const incident = state({ impact: { description: '', usersAffected: 0, platforms: [] } });

  return after(incident).compute((inc) => {
    if (!inc?.impact) return null;
    return Stack(
      Card(Text(inc.impact.description)),
      Card(Text(`Users: ${inc.impact.usersAffected}`)),
      ...inc.impact.platforms.map((p) => Badge(p)),
    );
  });
};
