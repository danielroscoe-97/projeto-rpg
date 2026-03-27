/**
 * BMAD Orchestrator — Claude Code Runner
 *
 * Executes prompts via Claude Code CLI with full project context.
 * - No shell: true (prevents command injection)
 * - Prompts via stdin (avoids escaping issues)
 * - Uses Max plan (zero API cost)
 */

import { spawn, execFileSync } from "child_process";
import { config } from "./config.js";
import { logger } from "./logger.js";

/**
 * Resolve the absolute path to the `claude` CLI binary.
 * On Windows, `spawn` with `shell: false` doesn't search PATH for npm globals,
 * so we resolve the full path once at module load.
 */
function resolveClaudePath(): string {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const result = execFileSync(cmd, ["claude"], { encoding: "utf-8", shell: true }).trim();
    // `where` on Windows can return multiple lines — take the first .cmd or first line
    const lines = result.split(/\r?\n/).filter(Boolean);
    const cmdLine = lines.find((l) => l.endsWith(".cmd")) || lines[0];
    logger.info(`Resolved claude CLI: ${cmdLine}`);
    return cmdLine;
  } catch {
    // Fallback — hope it's in PATH at runtime
    logger.warn("Could not resolve claude path — falling back to 'claude'");
    return "claude";
  }
}

const CLAUDE_BIN = resolveClaudePath();

export interface ClaudeResult {
  output: string;
  exitCode: number;
  isRateLimited: boolean;
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

    // On Windows, .cmd wrappers require shell: true to execute.
    // Prompt is piped via stdin (not args), so shell injection is not a risk.
    const isWindows = process.platform === "win32";
    const proc = spawn(CLAUDE_BIN, args, {
      cwd: cwd || config.projectRoot,
      env,
      shell: isWindows,
    });

    let stdout = "";
    let stderr = "";

    const killTimer = setTimeout(() => {
      logger.warn(`Claude timeout after ${timeoutMs / 1000}s — killing process`);
      proc.kill("SIGTERM");
      setTimeout(() => {
        // Check if process actually exited (exitCode is set when reaped)
        if (proc.exitCode === null) {
          logger.warn("SIGTERM did not terminate Claude — sending SIGKILL");
          proc.kill("SIGKILL");
        }
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

      const combined = stdout + stderr;
      const isRateLimited = code !== 0 && (
        combined.includes("rate limit") ||
        combined.includes("429") ||
        combined.includes("too many requests") ||
        combined.includes("capacity") ||
        combined.includes("overloaded")
      );

      resolve({
        output: stdout.trim(),
        exitCode: code ?? 1,
        isRateLimited,
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
