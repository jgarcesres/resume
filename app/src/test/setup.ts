import '@testing-library/jest-dom';

// DOM stubs only apply to jsdom; some tests (e.g. the WASM one) run in node.
if (typeof window !== 'undefined') {
  // Mock IntersectionObserver for framer-motion whileInView
  class MockIntersectionObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom has no canvas backend; return "no context" quietly instead of logging
// a not-implemented error for every component that probes for one.
// (Some suites run in the node environment, where there is no DOM at all.)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
