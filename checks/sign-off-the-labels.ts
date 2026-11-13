// sign-off-the-labels: a person read each label and signed it, and ticked the done list.
// Claude never signs a label on its own.
import type { Rule } from "../scripts/verify";
import { fieldOf } from "./build-the-label-skill";
import { bakeryRule, has, KEY, originalsUnchanged, text } from "./lib/bakery";
import { fold } from "./lib/md";
import { checkboxLines } from "./write-the-done-list";

const LABELS = "out/labels";
const SLUGS = Object.keys(KEY.labels);

const signer = (folder: string, slug: string) =>
  fieldOf(text(folder, `${LABELS}/${slug}.md`), "checked by") ?? "";

const isTicked = (line: string) => /\[[xX]\]/.test(line);

export default [
  bakeryRule,
  {
    says: `there is a label for each of the ${SLUGS.length} recipes in ${LABELS}/`,
    test: (folder) => SLUGS.every((slug) => has(folder, `${LABELS}/${slug}.md`)),
    tryNext: "finish build-the-label-skill first, then come back",
  },
  {
    says: 'every label has a name after "Checked by:"',
    test: (folder) => SLUGS.every((slug) => signer(folder, slug) !== ""),
    tryNext: "read each label, then tell Claude your name for the Checked by line",
  },
  {
    says: "no label is signed by Claude",
    test: (folder) => SLUGS.every((slug) => !fold(signer(folder, slug)).includes("claude")),
    tryNext: "a person signs; tell Claude to put your name, not its own, on the Checked by line",
  },
  {
    says: "every item in out/labels-done.md is ticked",
    test: (folder) => {
      const lines = checkboxLines(folder);
      return lines.length > 0 && lines.every(isTicked);
    },
    tryNext: "check each item on the done list, then ask Claude to tick it: [x]",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "sign the labels in out/labels/, not the old ones in labels/",
  },
] satisfies Rule[];
