// The smallest .xlsx reader and writer the course needs. A .xlsx file is a zip of XML files.
// Reads the first sheet of a workbook made by Excel, Numbers, LibreOffice or Python's openpyxl.
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type Cell = string | number | boolean | null;

// "&amp;" goes last, so "&amp;lt;" turns into "&lt;" and not into "<".
const unescapeXml = (xml: string) =>
  xml
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");

// "&" goes first, so the "&" in "&lt;" is not escaped twice.
const escapeXml = (plain: string) =>
  plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The text inside every <t> tag, joined together.
const textOf = (xml: string) => {
  const pieces = [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)];
  return pieces.map((match) => unescapeXml(match[1])).join("");
};

// Column letters to a number counted from 0: A is 0, Z is 25, AA is 26.
function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/)?.[0] ?? "A";
  let column = 0;
  for (const letter of letters) column = column * 26 + (letter.charCodeAt(0) - 64);
  return column - 1;
}

type Files = Record<string, Uint8Array>;

const fileText = (files: Files, name: string) =>
  files[name] ? strFromU8(files[name]) : undefined;

// Strings used in many cells are stored once in sharedStrings.xml; cells point to them by number.
function sharedStrings(files: Files): string[] {
  const xml = fileText(files, "xl/sharedStrings.xml") ?? "";
  const items = [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)];
  return items.map((match) => textOf(match[1]));
}

// Find the first sheet named in the workbook, through its relationship id.
function firstSheet(files: Files): string | undefined {
  const workbook = fileText(files, "xl/workbook.xml") ?? "";
  const relationshipId = workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const relationships = fileText(files, "xl/_rels/workbook.xml.rels") ?? "";
  let target: string | undefined;
  if (relationshipId) {
    const idThenTarget = `<Relationship\\b[^>]*Id="${relationshipId}"[^>]*Target="([^"]+)"`;
    const targetThenId = `<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${relationshipId}"`;
    target =
      relationships.match(new RegExp(idThenTarget))?.[1] ??
      relationships.match(new RegExp(targetThenId))?.[1];
  }
  if (target) target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  return (target && fileText(files, target)) ?? fileText(files, "xl/worksheets/sheet1.xml");
}

// One cell's value, from its type attribute and the XML inside it.
function cellValue(type: string | undefined, inner: string, shared: string[]): Cell {
  const stored = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
  if (type === "s") return stored === undefined ? null : shared[Number(stored)];
  if (type === "inlineStr") return textOf(inner);
  if (type === "str" || type === "e") return stored === undefined ? null : unescapeXml(stored);
  if (type === "b") return stored === "1";
  if (stored !== undefined) return Number(stored);
  return null;
}

// One row's cells, placed in their columns, with empty gaps filled by null.
function readRow(rowXml: string, shared: string[]): Cell[] {
  const row: Cell[] = [];
  for (const cellMatch of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attributes = cellMatch[1];
    const reference = attributes.match(/\br="([A-Z]+)\d+"/)?.[1];
    const column = reference ? columnIndex(reference) : row.length;
    const type = attributes.match(/\bt="([^"]+)"/)?.[1];
    row[column] = cellValue(type, cellMatch[2] ?? "", shared);
  }
  for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null;
  return row;
}

const hasContent = (row: Cell[]) => row.some((cell) => cell !== null && cell !== "");

export function readXlsx(bytes: Uint8Array): Cell[][] {
  const files = unzipSync(bytes);
  const shared = sharedStrings(files);
  const sheet = firstSheet(files);
  if (!sheet) throw new Error("the workbook has no sheet");
  const rows: Cell[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = rowMatch[0].match(/\br="(\d+)"/)?.[1] ?? rows.length + 1;
    rows[Number(rowNumber) - 1] = readRow(rowMatch[1] ?? "", shared);
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows.filter(hasContent);
}

const trimmedText = (cell: Cell | undefined) =>
  typeof cell === "string" ? cell.trim() : (cell ?? null);

// Rows as objects keyed by the first row, with header names trimmed and lower-cased.
export function xlsxObjects(bytes: Uint8Array): Record<string, Cell>[] {
  const [head, ...body] = readXlsx(bytes);
  if (!head) return [];
  const keys = head.map((heading) => {
    const headingText = String(heading ?? "");
    return headingText.trim().toLowerCase();
  });
  return body.map((row) => {
    const pairs = keys.map((key, i) => [key, trimmedText(row[i])]);
    return Object.fromEntries(pairs);
  });
}

// A column number counted from 0 to its letters: 0 is A, 25 is Z, 26 is AA.
function columnLetters(index: number): string {
  let letters = "";
  let remaining = index + 1;
  while (remaining) {
    const letter = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + letter) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
}

function cellXml(cell: Cell, reference: string): string {
  if (cell === null || cell === "") return "";
  if (typeof cell === "number") return `<c r="${reference}"><v>${cell}</v></c>`;
  if (typeof cell === "boolean") {
    return `<c r="${reference}" t="b"><v>${cell ? 1 : 0}</v></c>`;
  }
  const inline = `<is><t xml:space="preserve">${escapeXml(cell)}</t></is>`;
  return `<c r="${reference}" t="inlineStr">${inline}</c>`;
}

function rowXml(row: Cell[], rowIndex: number): string {
  const rowNumber = rowIndex + 1;
  const cells = row.map((cell, column) => cellXml(cell, `${columnLetters(column)}${rowNumber}`));
  return `<row r="${rowNumber}">${cells.join("")}</row>`;
}

// The fixed parts of a workbook. Every .xlsx file needs them, whatever its cells hold.
const XML_START = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const PACKAGE = "http://schemas.openxmlformats.org/package/2006";
const OFFICE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const SPREADSHEET = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const OPEN_XML = "application/vnd.openxmlformats";
const SHEET_TYPE = `${OPEN_XML}-officedocument.spreadsheetml`;

const CONTENT_TYPES =
  XML_START +
  `<Types xmlns="${PACKAGE}/content-types">` +
  `<Default Extension="rels" ContentType="${OPEN_XML}-package.relationships+xml"/>` +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  `<Override PartName="/xl/workbook.xml" ContentType="${SHEET_TYPE}.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${SHEET_TYPE}.worksheet+xml"/>` +
  "</Types>";

const relationshipsXml = (type: string, target: string) =>
  XML_START +
  `<Relationships xmlns="${PACKAGE}/relationships">` +
  `<Relationship Id="rId1" Type="${OFFICE}/${type}" Target="${target}"/>` +
  "</Relationships>";

const workbookXml = (sheetName: string) =>
  XML_START +
  `<workbook xmlns="${SPREADSHEET}" xmlns:r="${OFFICE}">` +
  `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
  "</workbook>";

const worksheetXml = (rowsXml: string) =>
  `${XML_START}<worksheet xmlns="${SPREADSHEET}"><sheetData>${rowsXml}</sheetData></worksheet>`;

export function writeXlsx(rows: Cell[][], sheetName = "Sheet1"): Uint8Array {
  const rowsXml = rows.map(rowXml).join("");
  const files: Files = {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(relationshipsXml("officeDocument", "xl/workbook.xml")),
    "xl/workbook.xml": strToU8(workbookXml(sheetName)),
    "xl/_rels/workbook.xml.rels": strToU8(relationshipsXml("worksheet", "worksheets/sheet1.xml")),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(rowsXml)),
  };
  // A fixed time keeps the bytes the same on every build, so the seed does not churn.
  return zipSync(files, { mtime: new Date(Date.UTC(2026, 0, 1)) });
}
