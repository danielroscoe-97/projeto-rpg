/**
 * BMAD Orchestrator — Agent Loader
 *
 * Reads the BMAD agent manifest CSV and agent definition files
 * to build agent personality data for prompts.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { config } from "./config.js";

export interface BmadAgent {
  name: string;
  displayName: string;
  title: string;
  icon: string;
  role: string;
  identity: string;
  communicationStyle: string;
  principles: string;
  path: string;
}

/**
 * Parse a CSV line handling quoted fields with commas.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse the BMAD agent manifest CSV into structured agent data.
 */
export function loadAgentManifest(): BmadAgent[] {
  const csvPath = join(config.projectRoot, config.paths.agentManifest);
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").replace(/&apos;/g, "'");
    });
    return {
      name: row.name || "",
      displayName: row.displayName || "",
      title: row.title || "",
      icon: row.icon || "",
      role: row.role || "",
      identity: row.identity || "",
      communicationStyle: row.communicationStyle || "",
      principles: row.principles || "",
      path: row.path || "",
    };
  });
}

/**
 * Build a system prompt for a BMAD agent.
 */
export function buildAgentPrompt(agent: BmadAgent): string {
  return `You are ${agent.displayName} (${agent.icon}), the ${agent.title}.

## Role
${agent.role}

## Identity
${agent.identity}

## Communication Style
${agent.communicationStyle}

## Principles
${agent.principles}

## Project Context
You are working on "Pocket DM", a D&D 5e combat tracker.
- Language: Brazilian Portuguese (code comments and git in English)
- Stack: Next.js 16, React 19, TypeScript, Supabase, Zustand, Tailwind
- PRD: docs/prd-v2.md
- Sprint spec: docs/epics-and-sprints-spec.md
- Project rules: _bmad-output/project-context.md

## Critical Rules
- NEVER send exact monster stats to players (anti-metagaming)
- ALL UI strings must be in messages/pt-BR.json and messages/en.json
- ALL user input validated with Zod schemas
- Tests required for new code (Jest + React Testing Library)
- Sanitize all broadcast data via lib/realtime/broadcast.ts`;
}

/**
 * Determine which tools each agent type should have access to.
 */
export function getToolsForAgent(agentName: string): string[] {
  const readOnly = ["Read", "Glob", "Grep"];
  const readWrite = ["Read", "Glob", "Grep", "Edit", "Write", "Bash"];

  switch (agentName) {
    case "dev":
    case "quick-flow-solo-dev":
      return readWrite;
    case "qa":
      return [...readOnly, "Bash"];
    case "architect":
    case "pm":
    case "analyst":
    case "sm":
    case "tech-writer":
      return [...readOnly, "Write"];
    case "ux-designer":
      return readOnly;
    default:
      return readOnly;
  }
}

/**
 * Get a specific agent by name.
 */
export function getAgent(name: string): BmadAgent | undefined {
  return loadAgentManifest().find((a) => a.name === name);
}
