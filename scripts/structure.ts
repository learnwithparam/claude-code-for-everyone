// Reads the repo layout once. Every other script asks this file where things are.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");

export type Step = {
  name: string; // verb-the-thing, also the command argument
  dir: string;
  part: string;
  meta: { minutes: number; screen: boolean; solution: boolean };
};
export type Part = { name: string; dir: string; steps: Step[] };

// What a step.toml may hold. Any of it can be left out.
type StepToml = { minutes?: number; screen?: boolean; solution?: boolean };

// The folders inside a folder, in name order. A missing folder has none.
function foldersIn(parent: string): string[] {
  if (!existsSync(parent)) return [];
  const entries = readdirSync(parent);
  return entries.filter((entry) => statSync(join(parent, entry)).isDirectory()).sort();
}

// Folders keep an order prefix for sorting only. Learners never type it.
export const bareName = (folder: string) => folder.replace(/^\d+-/, "");

function readStep(partFolder: string, folderName: string, partName: string): Step {
  const stepFolder = join(partFolder, folderName);
  const metaPath = join(stepFolder, "step.toml");
  let meta: StepToml = {};
  if (existsSync(metaPath)) meta = Bun.TOML.parse(readFileSync(metaPath, "utf8")) as StepToml;
  return {
    name: bareName(folderName),
    dir: stepFolder,
    part: partName,
    meta: {
      minutes: Number(meta.minutes ?? 0),
      screen: Boolean(meta.screen),
      solution: Boolean(meta.solution),
    },
  };
}

// The orientation counts as the first part when 00-orientation/ holds a step folder
// (one with a step.toml).
export function parts(): Part[] {
  const partsFolder = join(ROOT, "parts");
  const orientation = join(ROOT, "00-orientation");
  const isStep = (parent: string, folderName: string) =>
    existsSync(join(parent, folderName, "step.toml"));
  const list = foldersIn(partsFolder).map((folderName) => ({
    dir: join(partsFolder, folderName),
    name: bareName(folderName),
  }));
  if (foldersIn(orientation).some((folderName) => isStep(orientation, folderName))) {
    list.unshift({ dir: orientation, name: "orientation" });
  }
  const withSteps = list.map(({ dir, name }) => {
    // Inside a part every folder is a step; orientation also holds folders that are not steps.
    const stepFolders = foldersIn(dir).filter(
      (folderName) => isStep(dir, folderName) || dir !== orientation,
    );
    const steps = stepFolders.map((folderName) => readStep(dir, folderName, name));
    return { name, dir, steps };
  });
  // A part with no step folders yet is a skeleton for a later build session.
  return withSteps.filter((part) => part.steps.length > 0);
}

export const allSteps = () => parts().flatMap((part) => part.steps);

export function findStep(name: string): Step | undefined {
  return allSteps().find((step) => step.name === name);
}
