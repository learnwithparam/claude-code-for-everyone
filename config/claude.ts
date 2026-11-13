// The one place that says how this course talks to Claude Code. There is no model API here: the
// learner works in the real Claude Code (the claude command, the editor extension or the desktop
// app's Code tab), signed in with their own Claude account. Claude Code picks the model; the course
// never names one.
//
// The flags were read from `claude --help` and https://code.claude.com/docs/en/cli-reference.md
// on the build date.
import { spawnSync } from "node:child_process";

// The oldest Claude Code the course is tested on. 2.1.314 adds the setting
// permissions.blockWritesOutsideWorkingDirectories, which set-the-safety-rules uses
// (https://code.claude.com/docs/en/permission-modes.md). It was published on npm
// (@anthropic-ai/claude-code) on 2026-10-30. The recordings in world/recordings/ were made with
// TESTED_ON.
export const MIN_VERSION = "2.1.314";
export const TESTED_ON = "2.1.322";

// What the finished Friday close may do without asking, in a run where nobody is there to click
// Allow. Edits in the bakery folder are allowed by acceptEdits; the bakery's own
// .claude/settings.json and its hook still block writes outside the folder and any change to an
// original file.
export const ALLOWED_TOOLS = [
  "Read",
  "Glob",
  "Grep",
  "Write",
  "Edit",
  "Skill",
  "Bash(bun *)",
  "Bash(ls *)",
  "Bash(mkdir *)",
];
export const MAX_TURNS = 120;

// The run with nobody watching: `claude -p` with a stream of JSON events, so every step Claude
// took is on record.
export function headlessArgs(prompt: string): string[] {
  return [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    ...ALLOWED_TOOLS,
    "--max-turns",
    String(MAX_TURNS),
  ];
}

// Claude Code started from inside another Claude Code session would think it is a child of that
// session, so take away the variables that say so.
const SESSION_MARKERS = [
  "CLAUDECODE",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_CHILD_SESSION",
];

export function cleanEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  for (const marker of SESSION_MARKERS) delete env[marker];
  return env;
}

export type ClaudeStatus = {
  installed: boolean;
  version?: string;
  newEnough?: boolean;
  signedIn?: boolean;
  how?: string;
};

// Below 0 when the first version is older, 0 when they are the same, above 0 when it is newer.
function compareVersions(first: string, second: string): number {
  const firstParts = first.split(".").map(Number);
  const secondParts = second.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const difference = (firstParts[i] ?? 0) - (secondParts[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// Ask Claude Code itself: `claude --version`, then `claude auth status`.
// Never read a credentials file.
export function claudeStatus(): ClaudeStatus {
  const versionRun = spawnSync("claude", ["--version"], {
    encoding: "utf8",
    env: cleanEnv(),
    timeout: 30000,
  });
  if (versionRun.error || versionRun.status !== 0) return { installed: false };
  const version = versionRun.stdout.match(/\d+\.\d+\.\d+/)?.[0];
  const authRun = spawnSync("claude", ["auth", "status"], {
    encoding: "utf8",
    env: cleanEnv(),
    timeout: 30000,
  });
  let signedIn = authRun.status === 0;
  let how: string | undefined;
  try {
    const auth = JSON.parse(authRun.stdout);
    signedIn = auth.loggedIn === true;
    how = auth.authMethod;
  } catch {
    // When the answer is not JSON, the exit code above is all we know.
  }
  return {
    installed: true,
    version,
    newEnough: version ? compareVersions(version, MIN_VERSION) >= 0 : false,
    signedIn,
    how,
  };
}

// A live run needs Claude Code, signed in, and not CI. REPLAY=1 forces a replay.
export function canRunLive(status: ClaudeStatus = claudeStatus()): boolean {
  if (process.env.CI || process.env.REPLAY === "1") return false;
  return status.installed && !!status.newEnough && !!status.signedIn;
}
