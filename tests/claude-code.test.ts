// The finished learner's Claude Code setup, tested with no model:
// - the hook gets the exact JSON Claude Code sends on stdin before a tool call
//   (PreToolUse input, https://code.claude.com/docs/en/hooks.md)
//   and must exit 2 to block, 0 to let it through;
// - the settings and skills parse the way Claude Code reads them;
// - each recorded real run of `claude -p` passes every check, judged over 3 runs,
//   and is a real transcript.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SETUP = join(ROOT, "world", "finished", "bakery");
const HOOK = join(SETUP, ".claude", "hooks", "protect-originals.ts");
const PROJECT = "/home/jess/wren-street";

// The key names below are the ones Claude Code itself sends, so they stay in snake_case.
function preToolUse(toolName: string, toolInput: Record<string, unknown>) {
  return {
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    session_id: "abc123",
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    prompt_id: "550e8400-e29b-41d4-a716-446655440000",
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    transcript_path: "/home/jess/.claude/projects/wren-street/abc123.jsonl",
    cwd: PROJECT,
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    permission_mode: "default",
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    hook_event_name: "PreToolUse",
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    tool_name: toolName,
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    tool_input: toolInput,
    // biome-ignore lint/style/useNamingConvention: Claude Code sends this key
    tool_use_id: "toolu_01ABC123",
  };
}

// What the Write tool sends: the file it writes and what goes in it.
function writeTool(path: string, content: string) {
  // biome-ignore lint/style/useNamingConvention: the Write tool's input has this key
  return preToolUse("Write", { file_path: path, content });
}

// What the Bash tool sends for one command.
function bashTool(command: string) {
  return preToolUse("Bash", {
    command,
    description: "",
    timeout: 120000,
    // biome-ignore lint/style/useNamingConvention: the Bash tool's input has this key
    run_in_background: false,
  });
}

// Run the hook the way Claude Code does: the event on stdin, the project folder in the env.
function runHookIn(projectFolder: string, event: object) {
  const result = spawnSync("bun", [HOOK], {
    input: JSON.stringify(event),
    encoding: "utf8",
    // biome-ignore lint/style/useNamingConvention: Claude Code sets this environment variable
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectFolder },
  });
  return { code: result.status, stderr: result.stderr };
}
const runHook = (event: object) => runHookIn(PROJECT, event);

function fileTests() {
  test("lets Claude write a new file in out/", () => {
    const result = runHook(writeTool(`${PROJECT}/out/orders-clean.csv`, "order_id\n"));
    expect(result.code).toBe(0);
  });
  test("blocks a write to the till, and says why", () => {
    const result = runHook(writeTool(`${PROJECT}/till/sales.csv`, ""));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only files in out/ may change");
  });
  test("blocks an edit to an original file", () => {
    const edit = preToolUse("Edit", {
      // biome-ignore lint/style/useNamingConvention: the Edit tool's input has this key
      file_path: `${PROJECT}/menu/menu.md`,
      // biome-ignore lint/style/useNamingConvention: the Edit tool's input has this key
      old_string: "£4.00",
      // biome-ignore lint/style/useNamingConvention: the Edit tool's input has this key
      new_string: "£4.20",
      // biome-ignore lint/style/useNamingConvention: the Edit tool's input has this key
      replace_all: false,
    });
    expect(runHook(edit).code).toBe(2);
  });
  test("blocks a write outside the bakery folder", () => {
    expect(runHook(writeTool("/home/jess/Documents/notes.md", "x")).code).toBe(2);
  });
  test("blocks a path that only looks like out/", () => {
    expect(runHook(writeTool(`${PROJECT}/outbox/x.md`, "x")).code).toBe(2);
  });
  test("handles Windows paths with back slashes", () => {
    const event = { ...writeTool("C:\\wren-street\\out\\x.md", "x"), cwd: "C:\\wren-street" };
    expect(runHookIn("C:\\wren-street", event).code).toBe(0);
  });
}

function commandTests() {
  test("blocks rm and mv, alone or after another command", () => {
    const commands = ["rm notes/owner-notes.md", "ls && rm -rf out", "mv till/sales.csv out/"];
    for (const command of commands) expect(runHook(bashTool(command)).code).toBe(2);
  });
  test("lets other commands through to the normal permission flow", () => {
    const commands = ["bun out/scripts/clean.ts", "ls out", "bun run verify clean-the-orders"];
    for (const command of commands) expect(runHook(bashTool(command)).code).toBe(0);
  });
}

describe("the protect-originals hook", () => {
  fileTests();
  commandTests();
});

const SETTINGS_TEST =
  "settings: Manual mode, no writes outside the folder, the hook on Write, Edit and Bash";

describe("the finished setup", () => {
  test(SETTINGS_TEST, () => {
    const settingsPath = join(SETUP, ".claude", "settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    expect(settings.permissions.defaultMode).toBe("default");
    expect(settings.permissions.blockWritesOutsideWorkingDirectories).toBe(true);
    const hook = settings.hooks.PreToolUse[0];
    expect(hook.matcher).toBe("Write|Edit|Bash");
    expect(hook.hooks[0].command).toContain(".claude/hooks/protect-originals.ts");
  });
  test("every skill has a name that matches its folder and a description", () => {
    const skillsFolder = join(SETUP, ".claude", "skills");
    for (const name of readdirSync(skillsFolder)) {
      const skill = readFileSync(join(skillsFolder, name, "SKILL.md"), "utf8");
      const front = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
      expect(front).toMatch(new RegExp(`^name: ${name}$`, "m"));
      expect(front).toMatch(/^description: .{20,}$/m);
      expect(skill).toContain("## Never");
    }
  });
});

// The parts of a stream-json transcript line these tests look at.
type ContentBlock = {
  type: string;
  name?: string;
  // biome-ignore lint/style/useNamingConvention: the Write tool's input has this key
  input?: { file_path?: string };
};
type TranscriptEvent = {
  type: string;
  subtype?: string;
  // biome-ignore lint/style/useNamingConvention: the transcript has this key
  claude_code_version?: string;
  message?: { content: ContentBlock[] };
};

const RECORDINGS = join(ROOT, "world", "recordings");

function recordedRuns(): string[] {
  if (!existsSync(RECORDINGS)) return [];
  const isRun = (folderName: string) =>
    folderName.startsWith("close-") && existsSync(join(RECORDINGS, folderName, "transcript.jsonl"));
  return readdirSync(RECORDINGS).filter(isRun).sort();
}

function transcript(name: string): TranscriptEvent[] {
  const lines = readFileSync(join(RECORDINGS, name, "transcript.jsonl"), "utf8")
    .trim()
    .split("\n");
  return lines.map((line) => JSON.parse(line));
}

// Every Write tool call Claude made during the run.
function writesIn(events: TranscriptEvent[]): ContentBlock[] {
  const assistantTurns = events.filter((event) => event.type === "assistant");
  const blocks = assistantTurns.flatMap((event) => event.message?.content ?? []);
  return blocks.filter((block) => block.type === "tool_use" && block.name === "Write");
}

function testRecordedRun(name: string) {
  test(`${name} is a real Claude Code transcript`, () => {
    const events = transcript(name);
    const init = events.find((event) => event.type === "system" && event.subtype === "init");
    expect(init?.claude_code_version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(events.at(-1)?.type).toBe("result");
    // Every file the run says it wrote is in the recording.
    const writes = writesIn(events);
    expect(writes.length).toBeGreaterThan(0);
    for (const write of writes) {
      const relativePath = String(write.input?.file_path).replace("<bakery>/", "");
      expect(existsSync(join(RECORDINGS, name, "files", relativePath))).toBe(true);
    }
  });

  test(`${name}, replayed on a fresh bakery, passes every check`, async () => {
    const { prepare, replay, checkFolder } = await import("../world/finished");
    const folder = join(mkdtempSync(join(tmpdir(), "wren-replay-")), "wren-street");
    prepare(folder);
    replay(name, folder, () => {});
    const results = await checkFolder(folder);
    const failing = results.filter((result) => !result.pass);
    const reasons = failing.map((result) => `${result.step}: ${result.failed.join("; ")}`);
    expect(reasons).toEqual([]);
    rmSync(join(folder, ".."), { recursive: true, force: true });
  }, 60000);
}

describe("the recorded real runs", () => {
  const runs = recordedRuns();
  const recordList = join(RECORDINGS, "RECORD.md");
  const listed = existsSync(recordList) ? readFileSync(recordList, "utf8") : "";

  test("there are 3 recorded runs, or RECORD.md lists the runs still to record", () => {
    expect(runs.length >= 3 || /bun run finished --record/.test(listed)).toBe(true);
  });

  for (const name of runs) testRecordedRun(name);
});
