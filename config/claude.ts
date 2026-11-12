// The one place that says how this course talks to Claude Code. There is no model API here: the learner
// works in the real Claude Code (the claude command, the editor extension or the desktop app's Code tab),
// signed in with their own Claude account. Claude Code picks the model; the course never names one.
//
// Flags read from `claude --help` and https://code.claude.com/docs/en/cli-reference.md on the build date.
import { spawnSync } from "node:child_process";

// The oldest Claude Code the course is tested on. 2.1.314 adds permissions.blockWritesOutsideWorkingDirectories,
// which set-the-safety-rules uses (https://code.claude.com/docs/en/permission-modes.md). Published on npm
// (@anthropic-ai/claude-code) on 2026-10-30. The recordings in world/recordings/ were made with TESTED_ON.
export const MIN_VERSION = "2.1.314";
export const TESTED_ON = "2.1.322";

// What the finished Friday close may do without asking, in a run where nobody is there to click Allow.
// Edits in the bakery folder are allowed by acceptEdits; the bakery's own .claude/settings.json and its hook
// still block writes outside the folder and any change to an original file.
export const ALLOWED_TOOLS = ["Read", "Glob", "Grep", "Write", "Edit", "Skill", "Bash(bun *)", "Bash(ls *)", "Bash(mkdir *)"];
export const MAX_TURNS = 120;

// The headless run: `claude -p` with a stream of JSON events, so every step Claude took is on record.
export function headlessArgs(prompt: string): string[] {
  return [
    "-p", prompt,
    "--output-format", "stream-json",
    "--verbose",
    "--permission-mode", "acceptEdits",
    "--allowedTools", ...ALLOWED_TOOLS,
    "--max-turns", String(MAX_TURNS),
  ];
}

// Claude Code started from inside another Claude Code session would think it is a child; clear the markers.
export function cleanEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  for (const k of ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_CHILD_SESSION"]) delete env[k];
  return env;
}

export type ClaudeStatus = { installed: boolean; version?: string; newEnough?: boolean; signedIn?: boolean; how?: string };

const cmp = (a: string, b: string) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

// Ask Claude Code itself: `claude --version`, then `claude auth status`. Never read a credentials file.
export function claudeStatus(): ClaudeStatus {
  const v = spawnSync("claude", ["--version"], { encoding: "utf8", env: cleanEnv(), timeout: 30000 });
  if (v.error || v.status !== 0) return { installed: false };
  const version = v.stdout.match(/\d+\.\d+\.\d+/)?.[0];
  const a = spawnSync("claude", ["auth", "status"], { encoding: "utf8", env: cleanEnv(), timeout: 30000 });
  let signedIn = a.status === 0, how: string | undefined;
  try {
    const j = JSON.parse(a.stdout);
    signedIn = j.loggedIn === true;
    how = j.authMethod;
  } catch {}
  return { installed: true, version, newEnough: version ? cmp(version, MIN_VERSION) >= 0 : false, signedIn, how };
}

// A live run needs Claude Code, signed in, and not CI. REPLAY=1 forces a replay.
export function canRunLive(s: ClaudeStatus = claudeStatus()): boolean {
  if (process.env.CI || process.env.REPLAY === "1") return false;
  return s.installed && !!s.newEnough && !!s.signedIn;
}
