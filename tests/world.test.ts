// The world is the same on every build, and the readers handle real files.
// The finished close is a real Claude Code run: tests/claude-code.test.ts judges its recordings.
import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCsv, toCsv } from "../checks/lib/csv";
import { readXlsx, writeXlsx } from "../checks/lib/xlsx";
import { build, SEED_DIR, writeSeed } from "../world/build";

const ROOT = join(import.meta.dir, "..");

test("the committed seed and key are exactly what the generator builds", () => {
  const { files, key } = build(7);
  for (const [relativePath, body] of Object.entries(files)) {
    const built = Buffer.from(body);
    expect(readFileSync(join(SEED_DIR, relativePath)).equals(built)).toBe(true);
  }
  expect(JSON.parse(readFileSync(join(ROOT, "world", "key.json"), "utf8"))).toEqual(
    JSON.parse(JSON.stringify(key)),
  );
});

test("another seed gives a new batch with the same kinds of fault", () => {
  const firstKey = build(7).key;
  const secondKey = build(11).key;
  expect(secondKey.orders.clean).not.toEqual(firstKey.orders.clean);
  expect(secondKey.orders.duplicateIds.length).toBe(9);
  expect(secondKey.invoices.priceAbovePo.length).toBe(3);
  const folder = mkdtempSync(join(tmpdir(), "wren-seed-"));
  writeSeed(folder, build(11).files);
  rmSync(folder, { recursive: true, force: true });
});

test("the xlsx reader reads back what the writer wrote", () => {
  const rows = [
    ["product", "price"],
    ["Croissant", 1.1],
    ["Brownie & co <x>", 2.75],
  ];
  expect(readXlsx(writeXlsx(rows))).toEqual(rows);
});

test("the xlsx reader reads a workbook saved by Python's openpyxl", () => {
  const python = spawnSync("python3", ["-c", "import openpyxl"]);
  // openpyxl is not on this machine; the writer test above still runs.
  if (python.status !== 0) return;
  const folder = mkdtempSync(join(tmpdir(), "wren-xlsx-"));
  const workbookPath = join(folder, "p.xlsx");
  const pythonLines = [
    "import openpyxl",
    "wb=openpyxl.Workbook()",
    "ws=wb.active",
    'ws.append(["product","unit","shop_price"])',
    'ws.append(["Croissant","each",1.9])',
    'ws.append(["Cinnamon Bun","each",2.8])',
    `wb.save(${JSON.stringify(workbookPath)})`,
  ];
  spawnSync("python3", ["-c", pythonLines.join("\n")]);
  expect(readXlsx(new Uint8Array(readFileSync(workbookPath)))).toEqual([
    ["product", "unit", "shop_price"],
    ["Croissant", "each", 1.9],
    ["Cinnamon Bun", "each", 2.8],
  ]);
  rmSync(folder, { recursive: true, force: true });
});

test("csv round trip keeps commas and quotes", () => {
  const rows = [
    ["a", "b"],
    ["x, y", 'say "hi"'],
  ];
  expect(parseCsv(toCsv(rows))).toEqual(rows);
});
