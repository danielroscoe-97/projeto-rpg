/**
 * Phase 1: Remove background using @imgly/background-removal-node
 * Runs in its own process to avoid native module conflicts with sharp.
 */

import { removeBackground } from "@imgly/background-removal-node";
import { readFile, writeFile } from "node:fs/promises";

const [,, input, output] = process.argv;

const inputBuffer = await readFile(input);
const blob = await removeBackground(new Blob([inputBuffer], { type: "image/jpeg" }), {
  output: { format: "image/png", quality: 1 },
});
const buffer = Buffer.from(await blob.arrayBuffer());
await writeFile(output, buffer);
console.log("✅ Background removed →", output);
