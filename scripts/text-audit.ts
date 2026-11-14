// bun run text-audit: opens every route in a real browser and runs the 10 text checks.
// This course has one page, finished/index.html. It is built from a replayed recording and
// served as plain files, so the audit needs no app running.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./structure";

const finishedFolder = join(ROOT, "finished");
const configFile = join(ROOT, "e2e", "playwright.config.ts");

async function buildFinishedPage() {
  if (existsSync(join(finishedFolder, "index.html"))) return;
  const build = Bun.spawn(["bun", "world/finished.ts", "--replay", "1"], {
    cwd: ROOT,
    stdout: "ignore",
    stderr: "inherit",
  });
  await build.exited;
}

async function main(): Promise<number> {
  await buildFinishedPage();
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const name = new URL(request.url).pathname;
      const file = Bun.file(join(finishedFolder, name === "/" ? "index.html" : name));
      return (await file.exists())
        ? new Response(file)
        : new Response("Not found", { status: 404 });
    },
  });
  const install = Bun.spawnSync(["bunx", "playwright", "install", "chromium"], { cwd: ROOT });
  if (install.exitCode !== 0) {
    console.error("Could not get the browser. Try next: run bunx playwright install chromium.");
    server.stop();
    return 2;
  }
  const audit = Bun.spawn(["bunx", "playwright", "test", "-c", configFile, "--trace", "off"], {
    cwd: ROOT,
    // biome-ignore lint/style/useNamingConvention: AUDIT_URL is the name the audit reads
    env: { ...process.env, AUDIT_URL: `http://localhost:${server.port}` },
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await audit.exited;
  server.stop();
  if (exitCode !== 0) {
    console.error(
      "The text audit found problems. Try next: fix the lines marked above, then rerun.",
    );
  }
  return exitCode === 0 ? 0 : 1;
}

process.exit(await main());
