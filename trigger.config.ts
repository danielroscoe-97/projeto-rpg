import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const config: TriggerConfig = {
  project: "proj_pocketdm",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["./trigger"],
};
