import "@testing-library/jest-dom";

// Mock next-intl for all tests
jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    return (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{${k}}`, String(v)),
          fullKey,
        );
      }
      return fullKey;
    };
  },
  useLocale: () => "pt-BR",
}));

jest.mock("next-intl/server", () => ({
  getTranslations: (namespace?: string) => {
    return (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{${k}}`, String(v)),
          fullKey,
        );
      }
      return fullKey;
    };
  },
  getLocale: () => "pt-BR",
  getMessages: () => ({}),
}));

// 2026-04-26 (P-14 review): Mock the error capture module so unit tests
// don't trigger Sentry HTTP fetch on captureWarning/captureError calls.
// jsdom env doesn't polyfill global fetch, and even with node env the
// real Sentry transport would attempt outbound network calls during
// test runs — pollutes tests and slows CI. Mock returns no-op functions
// that callers can spy on if they need to assert capture behavior.
jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));
