// Orientation: the bakery folder exists, nothing in it changed,
// and the learner wrote why they are here.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { words } from "./lib/md";

const FILE = "out/why-i-am-here.md";
const EXAMPLE = /\[|the task you do by hand at work/i;

// The learner's words with any heading lines taken out.
const body = (folder: string) => text(folder, FILE).replace(/^#.*$/gm, "").trim();

// One sentence: 6 to 60 words and no more than two sentence endings.
function oneSentence(folder: string): boolean {
  const sentence = body(folder);
  const wordCount = words(sentence).length;
  const endings = sentence.match(/[.!?](\s|$)/g) ?? [];
  return wordCount >= 6 && wordCount <= 60 && endings.length <= 2;
}

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (folder) => has(folder, FILE),
    tryNext: "ask Claude to make out/why-i-am-here.md with your sentence in it",
  },
  {
    says: "it holds one sentence of 6 words or more",
    test: oneSentence,
    tryNext:
      "ask Claude to save one full sentence about one task at your job, ending with a full stop",
  },
  {
    says: "the sentence is your own, not the example",
    test: (folder) => !EXAMPLE.test(body(folder)),
    tryNext: "tell Claude a task from your own job, not the example from the page",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
