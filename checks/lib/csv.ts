// Read and write CSV the way a spreadsheet does: quotes, commas inside quotes, CRLF or LF.

// What the reader has built so far while it walks through the text one character at a time.
type Reading = { rows: string[][]; row: string[]; cell: string; quoted: boolean };

function endCell(reading: Reading) {
  reading.row.push(reading.cell);
  reading.cell = "";
}

function endRow(reading: Reading) {
  endCell(reading);
  reading.rows.push(reading.row);
  reading.row = [];
}

// Inside quotes, a doubled quote is one quote and a single quote closes the cell.
// Returns how many extra characters were used up.
function readQuoted(reading: Reading, character: string, next: string | undefined): number {
  if (character === '"' && next === '"') {
    reading.cell += '"';
    return 1;
  }
  if (character === '"') reading.quoted = false;
  else reading.cell += character;
  return 0;
}

// Outside quotes, commas end a cell and line breaks end a row.
// Returns how many extra characters were used up.
function readPlain(reading: Reading, character: string, next: string | undefined): number {
  if (character === '"') {
    reading.quoted = true;
  } else if (character === ",") {
    endCell(reading);
  } else if (character === "\n" || character === "\r") {
    endRow(reading);
    if (character === "\r" && next === "\n") return 1;
  } else {
    reading.cell += character;
  }
  return 0;
}

const isBlankRow = (row: string[]) => row.length === 1 && row[0].trim() === "";

export function parseCsv(text: string): string[][] {
  const reading: Reading = { rows: [], row: [], cell: "", quoted: false };
  const withoutByteOrderMark = text.replace(/^﻿/, "");
  for (let i = 0; i < withoutByteOrderMark.length; i++) {
    const character = withoutByteOrderMark[i];
    const next = withoutByteOrderMark[i + 1];
    if (reading.quoted) i += readQuoted(reading, character, next);
    else i += readPlain(reading, character, next);
  }
  if (reading.cell !== "" || reading.row.length) endRow(reading);
  return reading.rows.filter((row) => !isBlankRow(row));
}

// Rows as objects keyed by the header, with header names trimmed and lower-cased.
export function csvObjects(text: string): Record<string, string>[] {
  const [head, ...body] = parseCsv(text);
  if (!head) return [];
  const keys = head.map((heading) => heading.trim().toLowerCase());
  return body.map((row) => {
    const pairs = keys.map((key, i) => [key, (row[i] ?? "").trim()]);
    return Object.fromEntries(pairs);
  });
}

// A cell with a quote, comma or line break in it is wrapped in quotes, with its quotes doubled.
function quoteIfNeeded(value: string | number): string {
  const cellText = String(value);
  if (!/[",\n]/.test(cellText)) return cellText;
  return `"${cellText.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number)[][]): string {
  const lines = rows.map((row) => row.map(quoteIfNeeded).join(","));
  return `${lines.join("\n")}\n`;
}
