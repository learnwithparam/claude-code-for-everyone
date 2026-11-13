// Read a Markdown file as sections and bullets.
// Checks never judge wording, only structure and named facts.

const HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*([-*+]|\d+[.)])\s+\S/;
const BULLET_MARKER = /^\s*([-*+]|\d+[.)])\s+/;

// Each heading, lower-cased, with the text under it. Text before any heading sits under "".
export function sections(text: string): Record<string, string> {
  const found: Record<string, string> = {};
  let current = "";
  for (const line of text.split("\n")) {
    const heading = line.match(HEADING);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      found[current] = found[current] ?? "";
      continue;
    }
    found[current] = `${(found[current] ?? "") + line}\n`;
  }
  return found;
}

// The body of the first section whose heading contains the given words.
export function section(text: string, heading: string): string | undefined {
  const wanted = heading.toLowerCase();
  const all = sections(text);
  const match = Object.keys(all).find((title) => title.includes(wanted));
  return match === undefined ? undefined : all[match];
}

export const bullets = (text: string) =>
  text
    .split("\n")
    .filter((line) => BULLET.test(line))
    .map((line) => line.replace(BULLET_MARKER, "").trim());

export const words = (text: string) => text.split(/\s+/).filter(Boolean);

// Lower case, straight quotes, accents removed: used to look for names in free text.
export const fold = (phrase: string) => {
  const withoutAccents = phrase.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return withoutAccents.toLowerCase().replace(/[’']/g, "'");
};
