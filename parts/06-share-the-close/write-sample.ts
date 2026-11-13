// Write one sample folder (a solution/ or a wrong/<mistake>/) from scratch.
// prompts.md is written by a person from a real Claude Code session, so a rebuild keeps it.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function writeSample(folder: string, files: Record<string, string | Uint8Array>) {
  const promptsPath = join(folder, "prompts.md");
  const prompts = existsSync(promptsPath) ? readFileSync(promptsPath) : undefined;
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  if (prompts) writeFileSync(promptsPath, prompts);
  for (const [relativePath, contents] of Object.entries(files)) {
    const path = join(folder, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
}
