// Flesch-Kincaid grade for a learner page. Code, commands, links, diagrams and paths are left out:
// the learner copies those, they do not read them as prose.
// Each table row and list line counts as a sentence.

// A rough count of the spoken beats in a word: groups of vowels, less a silent ending.
export function syllables(word: string): number {
  const letters = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!letters) return 0;
  if (letters.length <= 3) return 1;
  const withoutSilentEnding = letters.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  const sounded = withoutSilentEnding.replace(/^y/, "");
  return Math.max(1, (sounded.match(/[aeiouy]{1,2}/g) ?? []).length);
}

const TABLE_SEPARATOR = /^\s*\|?[\s:-]+\|[\s|:-]*$/;
const MARKDOWN_MARKS = /^#+\s*|^\s*([-*+]|\d+[.)])\s+|\*\*|\|/g;

// The words a learner reads on the page, as sentences.
export function prose(markdown: string): string {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "it")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "");
  return withoutCode
    .split("\n")
    .filter((line) => !TABLE_SEPARATOR.test(line))
    .map((line) => line.replace(MARKDOWN_MARKS, " ").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:]$/.test(line) ? line : `${line}.`))
    .join(" ");
}

export function grade(markdown: string): { grade: number; words: number } {
  const text = prose(markdown);
  const sentences = Math.max(1, (text.match(/[.!?:]+(\s|$)/g) ?? []).length);
  const words = text.split(/\s+/).filter((word) => /[a-z]/i.test(word));
  if (words.length === 0) return { grade: 0, words: 0 };
  const totalSyllables = words.reduce((total, word) => total + syllables(word), 0);
  return {
    grade: 0.39 * (words.length / sentences) + 11.8 * (totalSyllables / words.length) - 15.59,
    words: words.length,
  };
}
