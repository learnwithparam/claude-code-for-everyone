// Flesch-Kincaid grade for a learner page. Code, commands, links, diagrams and paths are left out:
// the learner copies those, they do not read them as prose. Each table row and list line counts as a sentence.
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (s.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export function prose(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "it")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .split("\n")
    .filter((l) => !/^\s*\|?[\s:-]+\|[\s|:-]*$/.test(l)) // table separator rows
    .map((l) => l.replace(/^#+\s*|^\s*([-*+]|\d+[.)])\s+|\*\*|\|/g, " ").trim())
    .filter(Boolean)
    .map((l) => (/[.!?:]$/.test(l) ? l : `${l}.`))
    .join(" ");
}

export function grade(md: string): { grade: number; words: number } {
  const text = prose(md);
  const sentences = Math.max(1, (text.match(/[.!?:]+(\s|$)/g) ?? []).length);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length === 0) return { grade: 0, words: 0 };
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return { grade: 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59, words: words.length };
}
