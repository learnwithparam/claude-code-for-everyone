// The finished learner's Claude Code setup, tested with no model:
// - the hook gets the exact JSON Claude Code sends on stdin before a tool call
//   (PreToolUse input, https://code.claude.com/docs/en/hooks.md) and must exit 2 to block, 0 to let it through;
// - the settings and skills parse the way Claude Code reads them;
// - each recorded real run of `claude -p` passes every check, judged over 3 runs, and is a real transcript.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SETUP = join(ROOT, "world", "finished", "bakery");
const HOOK = join(SETUP, ".claude", "hooks", "protect-originals.ts");
const PROJECT = "/home/jess/wren-street";

function preToolUse(toolName: string, toolInput: Record<string, unknown>) {
  return {
    session_id: "abc123",
    prompt_id: "550e8400-e29b-41d4-a716-446655440000",
    transcript_path: "/home/jess/.claude/projects/wren-street/abc123.jsonl",
    cwd: PROJECT,
    permission_mode: "default",
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: "toolu_01ABC123",
  };
}
function runHook(event: object) {
  const r = spawnSync("bun", [HOOK], {
    input: JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT },
  });
  return { code: r.status, stderr: r.stderr };
}

describe("the protect-originals hook", () => {
  test("lets Claude write a new file in out/", () => {
    expect(
      runHook(
        preToolUse("Write", {
          file_path: `${PROJECT}/out/orders-clean.csv`,
          content: "order_id\n",
        }),
      ).code,
    ).toBe(0);
  });
  test("blocks a write to the till, and says why", () => {
    const r = runHook(preToolUse("Write", { file_path: `${PROJECT}/till/sales.csv`, content: "" }));
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("only files in out/ may change");
  });
  test("blocks an edit to an original file", () => {
    expect(
      runHook(
        preToolUse("Edit", {
          file_path: `${PROJECT}/menu/menu.md`,
          old_string: "£4.00",
          new_string: "£4.20",
          replace_all: false,
        }),
      ).code,
    ).toBe(2);
  });
  test("blocks a write outside the bakery folder", () => {
    expect(
      runHook(preToolUse("Write", { file_path: "/home/jess/Documents/notes.md", content: "x" }))
        .code,
    ).toBe(2);
  });
  test("blocks a path that only looks like out/", () => {
    expect(
      runHook(preToolUse("Write", { file_path: `${PROJECT}/outbox/x.md`, content: "x" })).code,
    ).toBe(2);
  });
  test("handles Windows paths with back slashes", () => {
    const event = {
      ...preToolUse("Write", { file_path: "C:\\wren-street\\out\\x.md", content: "x" }),
      cwd: "C:\\wren-street",
    };
    const r = spawnSync("bun", [HOOK], {
      input: JSON.stringify(event),
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: "C:\\wren-street" },
    });
    expect(r.status).toBe(0);
  });
  test("blocks rm and mv, alone or after another command", () => {
    for (const command of ["rm notes/owner-notes.md", "ls && rm -rf out", "mv till/sales.csv out/"])
      expect(
        runHook(
          preToolUse("Bash", {
            command,
            description: "",
            timeout: 120000,
            run_in_background: false,
          }),
        ).code,
      ).toBe(2);
  });
  test("lets other commands through to the normal permission flow", () => {
    for (const command of ["bun out/scripts/clean.ts", "ls out", "bun run verify clean-the-orders"])
      expect(
        runHook(
          preToolUse("Bash", {
            command,
            description: "",
            timeout: 120000,
            run_in_background: false,
          }),
        ).code,
      ).toBe(0);
  });
});

describe("the finished setup", () => {
  test("settings: Manual mode, no writes outside the folder, the hook on Write, Edit and Bash", () => {
    const s = JSON.parse(readFileSync(join(SETUP, ".claude", "settings.json"), "utf8"));
    expect(s.permissions.defaultMode).toBe("default");
    expect(s.permissions.blockWritesOutsideWorkingDirectories).toBe(true);
    const h = s.hooks.PreToolUse[0];
    expect(h.matcher).toBe("Write|Edit|Bash");
    expect(h.hooks[0].command).toContain(".claude/hooks/protect-originals.ts");
  });
  test("every skill has a name that matches its folder and a description", () => {
    const dir = join(SETUP, ".claude", "skills");
    for (const name of readdirSync(dir)) {
      const t = readFileSync(join(dir, name, "SKILL.md"), "utf8");
      const front = t.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
      expect(front).toMatch(new RegExp(`^name: ${name}$`, "m"));
      expect(front).toMatch(/^description: .{20,}$/m);
      expect(t).toContain("## Never");
    }
  });
});

describe("the recorded real runs", () => {
  const Recordings = join(ROOT, "world", "recordings");
  const runs = existsSync(Recordings)
    ? readdirSync(Recordings)
        .filter(
          (d) => d.startsWith("close-") && existsSync(join(Recordings, d, "transcript.jsonl")),
        )
        .sort()
    : [];
  const listed = existsSync(join(Recordings, "RECORD.md"))
    ? readFileSync(join(Recordings, "RECORD.md"), "utf8")
    : "";

  test("there are 3 recorded runs, or RECORD.md lists the runs still to record", () => {
    expect(runs.length >= 3 || /bun run finished --record/.test(listed)).toBe(true);
  });

  for (const name of runs) {
    test(`${name} is a real Claude Code transcript`, () => {
      const events = readFileSync(join(Recordings, name, "transcript.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
      const init = events.find((e) => e.type === "system" && e.subtype === "init");
      expect(init?.claude_code_version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(events.at(-1).type).toBe("result");
      // Every file the run says it wrote is in the recording.
      const writes = events
        .filter((e) => e.type === "assistant")
        .flatMap((e) => e.message.content)
        .filter((c: any) => c.type === "tool_use" && c.name === "Write");
      expect(writes.length).toBeGreaterThan(0);
      for (const w of writes) {
        const rel = String(w.input.file_path).replace("<bakery>/", "");
        expect(existsSync(join(Recordings, name, "files", rel))).toBe(true);
      }
    });

    test(`${name}, replayed on a fresh bakery, passes every check`, async () => {
      const { prepare, replay, checkFolder } = await import("../world/finished");
      const folder = join(mkdtempSync(join(tmpdir(), "wren-replay-")), "wren-street");
      prepare(folder);
      replay(name, folder, () => {});
      const results = await checkFolder(folder);
      expect(
        results.filter((r) => !r.pass).map((r) => `${r.step}: ${r.failed.join("; ")}`),
      ).toEqual([]);
      rmSync(join(folder, ".."), { recursive: true, force: true });
    }, 60000);
  }
});
