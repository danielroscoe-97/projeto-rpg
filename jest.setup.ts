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
