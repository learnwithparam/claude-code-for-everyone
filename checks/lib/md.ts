// Read a Markdown file as sections and bullets. Checks never judge wording, only structure and named facts.
export function sections(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current = "";
  for (const line of text.split("\n")) {
    const h = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (h) { current = h[1].trim().toLowerCase(); out[current] = out[current] ?? ""; continue; }
    out[current] = (out[current] ?? "") + line + "\n";
  }
  return out;
}

// The body of the first section whose heading contains the given words.
export function section(text: string, heading: string): string | undefined {
  const want = heading.toLowerCase();
  const all = sections(text);
  const k = Object.keys(all).find((h) => h.includes(want));
  return k === undefined ? undefined : all[k];
}

export const bullets = (text: string) =>
  text.split("\n").filter((l) => /^\s*([-*+]|\d+[.)])\s+\S/.test(l)).map((l) => l.replace(/^\s*([-*+]|\d+[.)])\s+/, "").trim());

export const words = (text: string) => text.split(/\s+/).filter(Boolean);

// Lower case, straight quotes, accents removed: used to look for names in free text.
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "'");
