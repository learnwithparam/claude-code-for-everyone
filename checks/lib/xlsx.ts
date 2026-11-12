// The smallest .xlsx reader and writer the course needs. A .xlsx file is a zip of XML files.
// Reads the first sheet of a workbook made by Excel, Numbers, LibreOffice or Python's openpyxl.
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type Cell = string | number | boolean | null;

const unescape = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function readXlsx(bytes: Uint8Array): Cell[][] {
  const files = unzipSync(bytes);
  const get = (name: string) => (files[name] ? strFromU8(files[name]) : undefined);
  const shared = [...(get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  // Find the first sheet named in the workbook, through its relationship id.
  const wb = get("xl/workbook.xml") ?? "";
  const rid = wb.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const rels = get("xl/_rels/workbook.xml.rels") ?? "";
  let target = rid ? rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))?.[1]
    ?? rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))?.[1] : undefined;
  if (target) target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  const sheet = (target && get(target)) ?? get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("the workbook has no sheet");
  const rows: Cell[][] = [];
  for (const rm of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(rm[0].match(/\br="(\d+)"/)?.[1] ?? rows.length + 1) - 1;
    const row: Cell[] = [];
    for (const cm of (rm[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const ci = ref ? colIndex(ref) : row.length;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const inner = cm[2] ?? "";
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let val: Cell = null;
      if (type === "s") val = v === undefined ? null : shared[Number(v)];
      else if (type === "inlineStr") val = textOf(inner);
      else if (type === "str" || type === "e") val = v === undefined ? null : unescape(v);
      else if (type === "b") val = v === "1";
      else if (v !== undefined) val = Number(v);
      row[ci] = val;
    }
    for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null;
    rows[r] = row;
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows.filter((r) => r.some((c) => c !== null && c !== ""));
}

// Rows as objects keyed by the first row, with header names trimmed and lower-cased.
export function xlsxObjects(bytes: Uint8Array): Record<string, Cell>[] {
  const [head, ...body] = readXlsx(bytes);
  if (!head) return [];
  const keys = head.map((h) => String(h ?? "").trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, typeof r[i] === "string" ? (r[i] as string).trim() : r[i] ?? null])));
}

export function writeXlsx(rows: Cell[][], sheetName = "Sheet1"): Uint8Array {
  const col = (i: number) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const body = rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((c, ci) => {
    const ref = `${col(ci)}${ri + 1}`;
    if (c === null || c === "") return "";
    if (typeof c === "number") return `<c r="${ref}"><v>${c}</v></c>`;
    if (typeof c === "boolean") return `<c r="${ref}" t="b"><v>${c ? 1 : 0}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(c)}</t></is></c>`;
  }).join("") + `</row>`).join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`),
  };
  // A fixed time keeps the bytes the same on every build, so the seed does not churn.
  return zipSync(files, { mtime: new Date(Date.UTC(2026, 0, 1)) });
}
