/**
 * BMAD Orchestrator — Configuration
 *
 * Central config with Zod runtime validation.
 * Fails fast on invalid environment / missing tools.
 */

import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__dirname, ".env") });

// -- Schema --

const configSchema = z.object({
  projectRoot: z.string().min(1),
  paths: z.object({
    agentManifest: z.string(),
    bmadConfig: z.string(),
    agentsDir: z.string(),
    prdV2: z.string(),
    sprintSpec: z.string(),
    projectContext: z.string(),
    orchestratorLog: z.string(),
  }),
  agent: z.object({
    maxTurnsPerStory: z.number().int().positive(),
    maxTurnsPerQuickFix: z.number().int().positive(),
    maxTurnsPerSpec: z.number().int().positive(),
    maxTurnsPerQA: z.number().int().positive(),
    maxTurnsPerChat: z.number().int().positive(),
    timeoutMs: z.number().int().positive(),
    models: z.object({
      orchestrator: z.string(),
      dev: z.string(),
      qa: z.string(),
      spec: z.string(),
      quickfix: z.string(),
      parsing: z.string(),
      chat: z.string(),
    }),
    permissionMode: z.literal("bypassPermissions"),
  }),
  git: z.object({
    baseBranch: z.string().min(1),
    branchPrefix: z.string(),
    autoCommit: z.boolean(),
    autoPush: z.boolean(),
    autoCreatePR: z.boolean(),
  }),
  slack: z.object({
    webhookUrl: z.string(),
    botToken: z.string(),
    channelId: z.string(),
    enabled: z.boolean(),
  }),
  groq: z.object({
    apiKey: z.string(),
    model: z.string(),
    language: z.string(),
  }),
  worktree: z.object({
    baseDir: z.string().min(1),
    maxConcurrent: z.number().int().positive(),
    cleanupOnSuccess: z.boolean(),
    rateLimitBackoffMs: z.number().int().positive(),
    maxRateLimitRetries: z.number().int().positive(),
  }),
  verifyFix: z.object({
    enabled: z.boolean(),
    maxAttempts: z.number().int().positive(),
    maxTurnsPerFix: z.number().int().positive(),
    runQACheck: z.boolean(),
  }),
  bmadFlow: z.object({
    maxTurnsPerPm: z.number().int().positive(),
    maxTurnsPerArchitect: z.number().int().positive(),
    maxTurnsPerSm: z.number().int().positive(),
    maxTurnsPerQa: z.number().int().positive(),
    runsDir: z.string(),
  }),
  escalation: z.object({
    criticalPaths: z.array(z.string()),
    alwaysEscalate: z.array(z.string()),
    autoApprove: z.array(z.string()),
  }),
});

export type Config = z.infer<typeof configSchema>;

// -- Raw Config --

const raw = {
  projectRoot: process.env.PROJECT_ROOT || ".",
  paths: {
    agentManifest: "_bmad/_config/agent-manifest.csv",
    bmadConfig: "_bmad/core/config.yaml",
    agentsDir: "_bmad/bmm/agents",
    prdV2: "docs/prd-v2.md",
    sprintSpec: "docs/epics-and-sprints-spec.md",
    projectContext: "_bmad-output/project-context.md",
    orchestratorLog: "scripts/orchestrator/logs",
  },
  agent: {
    maxTurnsPerStory: 80,
    maxTurnsPerQuickFix: 30,
    maxTurnsPerSpec: 40,
    maxTurnsPerQA: 40,
    maxTurnsPerChat: 10,
    timeoutMs: 45 * 60 * 1000,
    models: {
      orchestrator: "opus",
      dev: "opus",
      qa: "sonnet",
      spec: "sonnet",
      quickfix: "opus",
      parsing: "sonnet",
      chat: "sonnet",
    },
    permissionMode: "bypassPermissions" as const,
  },
  git: {
    baseBranch: "master",
    branchPrefix: "feat/",
    autoCommit: true,
    autoPush: true,
    autoCreatePR: true,
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
    botToken: process.env.SLACK_BOT_TOKEN || "",
    channelId: process.env.SLACK_CHANNEL_ID || "",
    enabled: !!(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN),
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: "whisper-large-v3",
    language: "pt",
  },
  worktree: {
    baseDir: join(tmpdir(), "bmad"),
    maxConcurrent: 4,
    cleanupOnSuccess: true,
    rateLimitBackoffMs: 30_000,
    maxRateLimitRetries: 5,
  },
  verifyFix: {
    enabled: true,
    maxAttempts: 3,
    maxTurnsPerFix: 30,
    runQACheck: true,
  },
  bmadFlow: {
    maxTurnsPerPm: 30,
    maxTurnsPerArchitect: 30,
    maxTurnsPerSm: 40,
    maxTurnsPerQa: 40,
    runsDir: "_bmad-output/bmad-runs",
  },
  escalation: {
    criticalPaths: [
      "supabase/migrations",
      "middleware.ts",
      "lib/supabase/server.ts",
      "lib/supabase/client.ts",
      "lib/realtime/broadcast.ts",
      ".env",
    ],
    alwaysEscalate: [
      "new_dependency",
      "architecture_change",
      "priority_change",
      "new_feature_not_in_prd",
      "delete_critical_file",
    ],
    autoApprove: [
      "implement_story",
      "write_tests",
      "fix_lint",
      "create_branch",
      "commit",
      "push",
      "create_pr",
    ],
  },
};

// -- Validate & Export --

import { existsSync as _existsSync } from "fs";
import { resolve } from "path";

// Resolve projectRoot to absolute and validate it exists
raw.projectRoot = resolve(raw.projectRoot);
const _isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.VITEST_WORKER_ID !== undefined;
if (!_isTestEnv && !_existsSync(raw.projectRoot)) {
  throw new Error(`PROJECT_ROOT does not exist: ${raw.projectRoot}`);
}

// Warn if Slack is "enabled" but no tokens are actually set
if (raw.slack.enabled && !raw.slack.webhookUrl && !raw.slack.botToken) {
  raw.slack.enabled = false;
  console.warn("[config] Slack marked enabled but no webhook/bot token set — disabling");
}

export const config: Config = configSchema.parse(raw);
