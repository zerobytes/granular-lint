import { Div, Span } from '@granularjs/core';
import { Alert, Badge } from '@granularjs/ui';

export const Page = ({ hasError, count, error, total }) =>
  Div(
    hasError ? Alert(error) : null,
    count > 0 ? Badge(`${count} items`) : null,
    total ? Span(total) : undefined,
  );
