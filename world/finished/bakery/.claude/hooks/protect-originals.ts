// A PreToolUse hook. Claude Code runs it before every Write, Edit or Bash call and sends the call
// as JSON on stdin (https://code.claude.com/docs/en/hooks.md). It blocks, with exit code 2, any
// write outside out/ and any rm or mv command. CLAUDE.md asks Claude not to do these things; this
// hook makes sure.
const input = JSON.parse(await Bun.stdin.text());
const tool: string = input.tool_name ?? "";
// The bakery folder, written with / and no / at the end, so paths compare the same on Windows.
const project = String(process.env.CLAUDE_PROJECT_DIR || input.cwd || "")
  .replace(/\\/g, "/")
  .replace(/\/$/, "");

// Claude Code shows what this prints to Claude, and exit code 2 stops the tool call.
function block(why: string): never {
  console.error(why);
  process.exit(2);
}

if (tool === "Write" || tool === "Edit") {
  const path = String(input.tool_input?.file_path ?? "").replace(/\\/g, "/");
  if (!path.startsWith(`${project}/out/`)) {
    block(
      `Blocked: only files in out/ may change. ${path} ` +
        "is an original bakery file or outside the folder.",
    );
  }
}

if (tool === "Bash") {
  const command = String(input.tool_input?.command ?? "");
  // rm, mv or rmdir as a command: at the start, or after a space, ;, &, | or (.
  if (/(^|[;&|(]\s*|\s)(rm|mv|rmdir)\s/.test(command))
    block("Blocked: no rm or mv in the bakery folder. Make a new file in out/ instead.");
}

process.exit(0);
