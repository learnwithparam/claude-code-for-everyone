// Where the learner's work is, and how to read it.
// A learner runs `bun run verify <step>`: the check reads the bakery folder, wren-street/.
// CI runs `bun run verify --all`: the check reads a step's problem/, solution/ or wrong/ folder. Those folders
// hold only the files a step makes; any other file is read from the seed, as if the learner left it alone.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const ROOT = join(import.meta.dir, "..", "..");
export const SEED = join(ROOT, "world", "seed", "wren-street");
export const BAKERY = process.env.WREN_STREET ?? join(ROOT, "wren-street");
export const KEY = JSON.parse(readFileSync(join(ROOT, "world", "key.json"), "utf8"));

const ciMode = () => process.argv.includes("--all");
const isStepProblem = (dir: string) => dir.endsWith(`${sep}problem`) && dir.includes(`${sep}`);

// The folder a check reads for this run.
export function workFolder(dir: string): string {
  if (isStepProblem(dir) && !ciMode()) {
    if (!existsSync(BAKERY)) throw new Error("no bakery folder");
    return BAKERY;
  }
  return dir;
}
const isSample = (dir: string) => workFolder(dir) !== BAKERY;

// The full path to a file the check reads, or undefined if it is not there.
export function find(dir: string, rel: string): string | undefined {
  const w = workFolder(dir);
  const p = join(w, rel);
  if (existsSync(p)) return p;
  if (isSample(dir) && existsSync(join(SEED, rel))) return join(SEED, rel);
  return undefined;
}
export const has = (dir: string, rel: string) => find(dir, rel) !== undefined;
export function text(dir: string, rel: string): string {
  const p = find(dir, rel);
  if (!p) throw new Error(`${rel} is missing`);
  return readFileSync(p, "utf8");
}
export function bytes(dir: string, rel: string): Uint8Array {
  const p = find(dir, rel);
  if (!p) throw new Error(`${rel} is missing`);
  return new Uint8Array(readFileSync(p));
}

function filesUnder(dir: string, base = dir, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory()
      ? filesUnder(p, base, out)
      : out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}
export const seedFiles = () => filesUnder(SEED).filter((f) => !f.startsWith("out/"));
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// Originals that are missing or not byte for byte the same as the start.
export function changedOriginals(folder: string): string[] {
  return seedFiles().filter((f) => {
    const p = join(folder, f);
    return (
      !existsSync(p) ||
      hash(new Uint8Array(readFileSync(p))) !== hash(new Uint8Array(readFileSync(join(SEED, f))))
    );
  });
}
export function originalsUnchanged(dir: string): boolean {
  const w = workFolder(dir);
  if (!isSample(dir)) return changedOriginals(w).length === 0;
  // A sample folder only holds what changed, so compare just the originals it holds.
  return seedFiles()
    .filter((f) => existsSync(join(w, f)))
    .every(
      (f) =>
        hash(new Uint8Array(readFileSync(join(w, f)))) ===
        hash(new Uint8Array(readFileSync(join(SEED, f)))),
    );
}

// The first rule of every step: there is a bakery folder to check.
export const bakeryRule = {
  says: "the bakery folder wren-street/ is there",
  test: (dir: string) => {
    workFolder(dir);
    return true;
  },
  tryNext: "run bun run world in the course folder to make it, then try again",
};
