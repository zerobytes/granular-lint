'use strict';

// This is a convenience marker rule that disables itself if when-arrow-functions is also enabled.
// Kept as a stub for backward compatibility / different severity profiles.
module.exports = {
  id: 'when-non-arrow-component-call',
  meta: {
    severity: 'warning',
    requiresGranular: true,
    description: 'Reserved alias of when-arrow-functions.',
  },
  create() {
    return {};
  },
};
