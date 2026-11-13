// recover-a-deleted-file: a command deleted the owner's notes. Rewind cannot bring back a file
// that only a command changed, so the notes come back from the save point, byte for byte.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { fold } from "./lib/md";
import { sameAsSavePoint } from "./rewind-a-bad-edit";

const NOTES = "notes/owner-notes.md";
const LOG = "out/undo-log.md";
// Words that say a command, not Claude's file tools, made the change.
const COMMAND_WORDS = ["command", "bash", "shell", "terminal", " rm "];

const logLines = (folder: string) => fold(text(folder, LOG)).split("\n");

function saysWhyRewindCouldNot(folder: string): boolean {
  const namesTheNotes = (line: string) => line.includes("owner-notes");
  const namesTheCommand = (line: string) =>
    COMMAND_WORDS.some((word) => ` ${line} `.includes(word));
  return logLines(folder).some((line) => namesTheNotes(line) && namesTheCommand(line));
}

export default [
  bakeryRule,
  {
    says: `${NOTES} is back`,
    test: (folder) => has(folder, NOTES),
    tryNext: 'ask Claude: "Bring back notes/owner-notes.md from the last save point"',
  },
  {
    says: `${NOTES} is byte for byte the same as the save point`,
    test: (folder) => sameAsSavePoint(folder, NOTES),
    tryNext: "Claude wrote the notes again from memory; ask it to restore them from the save point",
  },
  {
    says: "a line in the undo log names owner-notes.md and says a command deleted it",
    test: (folder) => has(folder, LOG) && saysWhyRewindCouldNot(folder),
    tryNext:
      'ask Claude to add "- owner-notes.md: rewind could not bring it back, because a command ' +
      'deleted it" to out/undo-log.md',
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "ask Claude to restore every changed file from the save point",
  },
] satisfies Rule[];
