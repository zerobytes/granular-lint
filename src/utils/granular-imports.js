'use strict';

const CORE_PACKAGES = new Set([
  '@granularjs/core',
  '@granularjs/ui',
  '@granularjs/data',
  '@granularjs/ssr',
]);

const JSX_PACKAGES = new Set([
  '@granularjs/jsx',
  '@granularjs/jsx/jsx-runtime',
  '@granularjs/jsx/jsx-dev-runtime',
]);

const REACT_PACKAGES = new Set(['react', 'react-dom', 'react-dom/client']);

const REACT_HOOKS = new Set([
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useId',
  'useTransition',
  'useDeferredValue',
  'useSyncExternalStore',
  'useInsertionEffect',
]);

const GRANULAR_REACTIVE_FACTORIES = new Set([
  'state',
  'signal',
  'computed',
  'derive',
  'persist',
  'observableArray',
  'context',
]);

const GRANULAR_OBSERVERS = new Set(['after', 'before']);

const GRANULAR_RENDER_HELPERS = new Set([
  'when',
  'list',
  'virtualList',
  'match',
  'portal',
  'ErrorBoundary',
]);

const GRANULAR_TAG_NAMES = new Set([
  'Html', 'Head', 'Title', 'Base', 'Link', 'Meta', 'Style',
  'Body', 'Article', 'Section', 'Nav', 'Aside', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'Hgroup', 'Header', 'Footer', 'Address', 'Main', 'Search',
  'P', 'Hr', 'Pre', 'Blockquote', 'Ol', 'Ul', 'Li', 'Dl', 'Dt', 'Dd',
  'Figure', 'Figcaption', 'Div', 'Menu',
  'A', 'Em', 'Strong', 'Small', 'S', 'Cite', 'Q', 'Dfn', 'Abbr', 'Ruby', 'Rt', 'Rp',
  'Data', 'Time', 'Code', 'Var', 'Samp', 'Kbd', 'Sub', 'Sup', 'I', 'B', 'U',
  'Mark', 'Bdi', 'Bdo', 'Span', 'Br', 'Wbr', 'Ins', 'Del',
  'Picture', 'Source', 'Img', 'Iframe', 'Embed', 'HtmlObject', 'Param', 'Video', 'Audio',
  'Track', 'Map', 'Area',
  'Table', 'Caption', 'Colgroup', 'Col', 'Tbody', 'Thead', 'Tfoot', 'Tr', 'Td', 'Th',
  'Form', 'Label', 'Input', 'Button', 'Select', 'Datalist', 'Optgroup', 'Option',
  'Textarea', 'Output', 'Progress', 'Meter', 'Fieldset', 'Legend',
  'Details', 'Summary', 'Dialog', 'Script', 'Noscript', 'Template', 'Slot', 'Canvas',
]);

module.exports = {
  CORE_PACKAGES,
  JSX_PACKAGES,
  REACT_PACKAGES,
  REACT_HOOKS,
  GRANULAR_REACTIVE_FACTORIES,
  GRANULAR_OBSERVERS,
  GRANULAR_RENDER_HELPERS,
  GRANULAR_TAG_NAMES,
};
