// Polyfill fetch globals for msw v2 compatibility with jsdom.
// jsdom does not expose the Fetch API globals that msw v2 requires.
const { TextEncoder, TextDecoder } = require("node:util");

if (typeof globalThis.TextEncoder === "undefined") {
  Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder });
}
if (typeof globalThis.TextDecoder === "undefined") {
  Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoder });
}

const { Blob } = require("node:buffer");
const { ReadableStream, TransformStream, WritableStream } = require("node:stream/web");

const fetchPolyfills: Record<string, unknown> = {
  Blob,
  ReadableStream,
  TransformStream,
  WritableStream,
};

for (const [key, value] of Object.entries(fetchPolyfills)) {
  if (typeof (globalThis as Record<string, unknown>)[key] === "undefined") {
    Object.defineProperty(globalThis, key, { value, writable: true });
  }
}

// Use whatwg-fetch for Request, Response, Headers, and fetch
require("whatwg-fetch");

// BroadcastChannel stub for msw WebSocket support
if (typeof globalThis.BroadcastChannel === "undefined") {
  class BroadcastChannelStub {
    name: string;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    constructor(name: string) { this.name = name; }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  }
  Object.defineProperty(globalThis, "BroadcastChannel", { value: BroadcastChannelStub, writable: true });
}

// Jest setup file for frontend tests
require("@testing-library/jest-dom");

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(): void {}
}

(global as any).IntersectionObserver = MockIntersectionObserver;

const localStorageMock: Storage = {
  length: 0,
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});
// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
import { server } from "./tests/mocks/server";
require("whatwg-fetch");

// Start API mocking before tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Cleanup
afterAll(() => server.close());
