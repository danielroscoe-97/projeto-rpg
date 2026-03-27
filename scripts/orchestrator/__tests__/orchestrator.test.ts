import { describe, it, expect } from "vitest";
import { quickParse } from "../orchestrator.js";

describe("quickParse", () => {
  it("should parse 'status' command", () => {
    expect(quickParse("status")).toEqual({ mode: "status", target: "queue" });
    expect(quickParse("qual o status")).toEqual({ mode: "status", target: "queue" });
    expect(quickParse("STATUS")).toEqual({ mode: "status", target: "queue" });
  });

  it("should parse stop commands in Portuguese and English", () => {
    expect(quickParse("para tudo")).toEqual({ mode: "stop", target: "" });
    expect(quickParse("stop")).toEqual({ mode: "stop", target: "" });
    expect(quickParse("parar")).toEqual({ mode: "stop", target: "" });
  });

  it("should parse queue start commands", () => {
    expect(quickParse("rodar queue")).toEqual({ mode: "queue", target: "start" });
    expect(quickParse("iniciar queue")).toEqual({ mode: "queue", target: "start" });
    expect(quickParse("comece a implementar")).toEqual({ mode: "queue", target: "start" });
    expect(quickParse("implementar tudo")).toEqual({ mode: "queue", target: "start" });
  });

  it("should parse queue pause commands", () => {
    expect(quickParse("pausar")).toEqual({ mode: "queue", target: "pause" });
    expect(quickParse("pause queue")).toEqual({ mode: "queue", target: "pause" });
  });

  it("should parse queue resume commands", () => {
    expect(quickParse("retomar")).toEqual({ mode: "queue", target: "resume" });
    expect(quickParse("resume queue")).toEqual({ mode: "queue", target: "resume" });
  });

  it("should return null for unrecognized commands", () => {
    expect(quickParse("implementa a story 1.1")).toBeNull();
    expect(quickParse("oi")).toBeNull();
    expect(quickParse("cria spec pra notificação")).toBeNull();
    expect(quickParse("")).toBeNull();
  });

  it("should handle case insensitivity", () => {
    expect(quickParse("PARA TUDO")).toEqual({ mode: "stop", target: "" });
    expect(quickParse("Status Da Queue")).toEqual({ mode: "status", target: "queue" });
    expect(quickParse("PAUSAR")).toEqual({ mode: "queue", target: "pause" });
  });

  it("should trim whitespace", () => {
    expect(quickParse("  status  ")).toEqual({ mode: "status", target: "queue" });
    expect(quickParse("  stop  ")).toEqual({ mode: "stop", target: "" });
  });
});
