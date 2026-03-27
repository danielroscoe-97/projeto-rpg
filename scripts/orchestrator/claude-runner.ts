/**
 * BMAD Orchestrator — Claude Code Runner
 *
 * Executes prompts via Claude Code CLI with full project context.
 * - No shell: true (prevents command injection)
 * - Prompts via stdin (avoids escaping issues)
 * - Uses Max plan (zero API cost)
 */

import { spawn } from "child_process";
import { config } from "./config.js";
import { logger } from "./logger.js";

export interface ClaudeResult {
  output: string;
  exitCode: number;
}

/**
 * Run a prompt through Claude Code CLI with full project context.
 */
export async function runClaude(options: {
  prompt: string;
  allowedTools?: string[];
  maxTurns?: number;
  model?: string;
  systemPrompt?: string;
  timeoutMs?: number;
  cwd?: string;
}): Promise<ClaudeResult> {
  const {
    prompt,
    allowedTools,
    maxTurns = 50,
    model = config.agent.models.orchestrator,
    systemPrompt,
    timeoutMs = config.agent.timeoutMs,
    cwd,
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      "--output-format", "text",
      "--max-turns", String(maxTurns),
      "--model", model,
      "--permission-mode", "bypassPermissions",
      "--dangerously-skip-permissions",
      "--setting-sources", "project",
    ];

    if (allowedTools && allowedTools.length > 0) {
      args.push("--allowedTools", allowedTools.join(","));
    }

    if (systemPrompt) {
      args.push("--append-system-prompt", systemPrompt);
    }

    // Remove ANTHROPIC_API_KEY so Claude Code uses Max plan auth
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    logger.claude("Spawning", { model, maxTurns, timeoutSec: timeoutMs / 1000 });

    // shell: false — args are passed directly, no interpolation risk
    const proc = spawn("claude", args, {
      cwd: cwd || config.projectRoot,
      env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    const killTimer = setTimeout(() => {
      logger.warn(`Claude timeout after ${timeoutMs / 1000}s — killing process`);
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!proc.killed) proc.kill("SIGKILL");
      }, 5000);
    }, timeoutMs);

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (!text.includes("DEP0190")) {
        process.stderr.write(text);
      }
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(killTimer);
      const durationMs = Date.now() - startTime;

      logger.taskComplete({
        task: "claude-run",
        model,
        maxTurns,
        durationMs,
        exitCode: code ?? 1,
        outputLength: stdout.length,
      });

      resolve({
        output: stdout.trim(),
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(killTimer);
      reject(new Error(`Claude CLI failed: ${err.message}\n${stderr}`));
    });

    // Pipe prompt via stdin — avoids all shell escaping issues
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}
