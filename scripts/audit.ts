// bun run audit: build finished/index.html from a replayed recording, serve it, run the text audit.
import { join } from "node:path";
import { finish } from "../world/finished";

const ROOT = join(import.meta.dir, "..");
const PORT = 4173;

// CI runs `bun run check` with no install step, so fetch the audit's tools here.
// Both commands do nothing when the package and the browser are already there.
for (const command of [
  ["bun", "install", "--frozen-lockfile"],
  ["bunx", "playwright", "install", "chromium"],
]) {
  const step = Bun.spawnSync(command, { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (step.exitCode !== 0) process.exit(step.exitCode ?? 1);
}

await finish({ quiet: true, replay: "1" });
const server = Bun.serve({
  port: PORT,
  fetch(request) {
    const path = new URL(request.url).pathname;
    const file = Bun.file(join(ROOT, "finished", path === "/" ? "index.html" : path));
    return file
      .exists()
      .then((found) => (found ? new Response(file) : new Response("", { status: 404 })));
  },
});
const run = Bun.spawn(
  ["bunx", "playwright", "test", "-c", "e2e/playwright.config.ts", "--trace", "off"],
  {
    cwd: ROOT,
    // biome-ignore lint/style/useNamingConvention: variable name set by the config
    env: { ...process.env, AUDIT_URL: `http://localhost:${PORT}` },
    stdout: "inherit",
    stderr: "inherit",
  },
);
const code = await run.exited;
server.stop(true);
process.exit(code);
