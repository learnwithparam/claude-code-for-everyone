// Reads the repo layout once. Every other script asks this file where things are.
import { readdirSync, existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");

export type Step = {
  name: string; // verb-the-thing, also the command argument
  dir: string;
  part: string;
  meta: { minutes: number; screen: boolean; solution: boolean };
};
export type Part = { name: string; dir: string; steps: Step[] };

const dirs = (p: string) =>
  existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()).sort() : [];

// Folders keep an order prefix for sorting only. Learners never type it.
export const bareName = (folder: string) => folder.replace(/^\d+-/, "");

// The orientation counts as the first part when 00-orientation/ holds a step folder (one with a step.toml).
export function parts(): Part[] {
  const root = join(ROOT, "parts");
  const orientation = join(ROOT, "00-orientation");
  const list = dirs(root).map((p) => ({ dir: join(root, p), name: bareName(p) }));
  if (dirs(orientation).some((d) => existsSync(join(orientation, d, "step.toml")))) list.unshift({ dir: orientation, name: "orientation" });
  return list.map(({ dir, name: partName }) => {
    const steps = dirs(dir).filter((s) => existsSync(join(dir, s, "step.toml")) || dir !== orientation).map((s) => {
      const sdir = join(dir, s);
      const metaPath = join(sdir, "step.toml");
      const raw = existsSync(metaPath) ? (Bun.TOML.parse(readFileSync(metaPath, "utf8")) as any) : {};
      return {
        name: bareName(s),
        dir: sdir,
        part: partName,
        meta: { minutes: Number(raw.minutes ?? 0), screen: Boolean(raw.screen), solution: Boolean(raw.solution) },
      };
    });
    return { name: partName, dir, steps };
  }).filter((p) => p.steps.length > 0); // a part with no step folders yet is a skeleton for a later build session
}

export const allSteps = () => parts().flatMap((p) => p.steps);

export function findStep(name: string): Step | undefined {
  return allSteps().find((s) => s.name === name);
}
