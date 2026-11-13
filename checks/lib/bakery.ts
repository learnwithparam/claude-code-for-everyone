// Where the learner's work is, and how to read it.
// A learner runs `bun run verify <step>`: the check reads the bakery folder, wren-street/.
// CI runs `bun run verify --all`: the check reads a step's problem/, solution/ or wrong/ folder.
// Those folders hold only the files a step makes; any other file is read from the seed,
// as if the learner left it alone.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const ROOT = join(import.meta.dir, "..", "..");
export const SEED = join(ROOT, "world", "seed", "wren-street");
export const BAKERY = process.env.WREN_STREET ?? join(ROOT, "wren-street");
export const KEY = JSON.parse(readFileSync(join(ROOT, "world", "key.json"), "utf8"));

const ciMode = () => process.argv.includes("--all");
const isStepProblem = (folder: string) =>
  folder.endsWith(`${sep}problem`) && folder.includes(`${sep}`);

// The folder a check reads for this run.
export function workFolder(folder: string): string {
  if (isStepProblem(folder) && !ciMode()) {
    if (!existsSync(BAKERY)) throw new Error("no bakery folder");
    return BAKERY;
  }
  return folder;
}
const isSample = (folder: string) => workFolder(folder) !== BAKERY;

// The full path to a file the check reads, or undefined if it is not there.
export function find(folder: string, relativePath: string): string | undefined {
  const fullPath = join(workFolder(folder), relativePath);
  if (existsSync(fullPath)) return fullPath;
  const seedPath = join(SEED, relativePath);
  if (isSample(folder) && existsSync(seedPath)) return seedPath;
  return undefined;
}
export const has = (folder: string, relativePath: string) =>
  find(folder, relativePath) !== undefined;

export function text(folder: string, relativePath: string): string {
  const path = find(folder, relativePath);
  if (!path) throw new Error(`${relativePath} is missing`);
  return readFileSync(path, "utf8");
}

export function bytes(folder: string, relativePath: string): Uint8Array {
  const path = find(folder, relativePath);
  if (!path) throw new Error(`${relativePath} is missing`);
  return new Uint8Array(readFileSync(path));
}

// Every file under a folder, as a path with forward slashes, relative to where we started.
function filesUnder(folder: string, base = folder, found: string[] = []): string[] {
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) {
      filesUnder(path, base, found);
    } else {
      found.push(relative(base, path).split(sep).join("/"));
    }
  }
  return found;
}

export const seedFiles = () => filesUnder(SEED).filter((file) => !file.startsWith("out/"));

const fingerprint = (path: string) => {
  const contents = new Uint8Array(readFileSync(path));
  return createHash("sha256").update(contents).digest("hex");
};
const sameAsSeed = (folder: string, file: string) =>
  fingerprint(join(folder, file)) === fingerprint(join(SEED, file));

// Originals that are missing or not byte for byte the same as the start.
export function changedOriginals(folder: string): string[] {
  return seedFiles().filter((file) => {
    return !existsSync(join(folder, file)) || !sameAsSeed(folder, file);
  });
}

export function originalsUnchanged(folder: string): boolean {
  const work = workFolder(folder);
  if (!isSample(folder)) return changedOriginals(work).length === 0;
  // A sample folder only holds what changed, so compare just the originals it holds.
  return seedFiles()
    .filter((file) => existsSync(join(work, file)))
    .every((file) => sameAsSeed(work, file));
}

// The first rule of every step: there is a bakery folder to check.
export const bakeryRule = {
  says: "the bakery folder wren-street/ is there",
  test: (folder: string) => {
    workFolder(folder);
    return true;
  },
  tryNext: "run bun run world in the course folder to make it, then try again",
};
