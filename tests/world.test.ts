// The world is the same on every build, the readers handle real files, and the finished close is stable.
import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, writeSeed, SEED_DIR } from "../world/build";
import { readXlsx, writeXlsx } from "../checks/lib/xlsx";
import { parseCsv, toCsv } from "../checks/lib/csv";

const ROOT = join(import.meta.dir, "..");

test("the committed seed and key are exactly what the generator builds", () => {
  const { files, key } = build(7);
  for (const [rel, body] of Object.entries(files)) {
    const want = typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
    expect(readFileSync(join(SEED_DIR, rel)).equals(want)).toBe(true);
  }
  expect(JSON.parse(readFileSync(join(ROOT, "world", "key.json"), "utf8"))).toEqual(JSON.parse(JSON.stringify(key)));
});

test("another seed gives a new batch with the same kinds of fault", () => {
  const a = build(7).key, b = build(11).key;
  expect(b.orders.clean).not.toEqual(a.orders.clean);
  expect(b.orders.duplicateIds.length).toBe(9);
  expect(b.invoices.priceAbovePo.length).toBe(3);
  const dir = mkdtempSync(join(tmpdir(), "wren-seed-"));
  writeSeed(dir, build(11).files);
  rmSync(dir, { recursive: true, force: true });
});

test("the xlsx reader reads back what the writer wrote", () => {
  const rows = [["product", "price"], ["Croissant", 1.1], ["Brownie & co <x>", 2.75]];
  expect(readXlsx(writeXlsx(rows))).toEqual(rows);
});

test("the xlsx reader reads a workbook saved by Python's openpyxl", () => {
  const py = spawnSync("python3", ["-c", "import openpyxl"]);
  if (py.status !== 0) return; // openpyxl is not on this machine; the writer test above still runs
  const dir = mkdtempSync(join(tmpdir(), "wren-xlsx-"));
  const out = join(dir, "p.xlsx");
  spawnSync("python3", ["-c", `import openpyxl\nwb=openpyxl.Workbook()\nws=wb.active\nws.append(["product","unit","shop_price"])\nws.append(["Croissant","each",1.9])\nws.append(["Cinnamon Bun","each",2.8])\nwb.save(${JSON.stringify(out)})`]);
  expect(readXlsx(new Uint8Array(readFileSync(out)))).toEqual([["product", "unit", "shop_price"], ["Croissant", "each", 1.9], ["Cinnamon Bun", "each", 2.8]]);
  rmSync(dir, { recursive: true, force: true });
});

test("csv round trip keeps commas and quotes", () => {
  const rows = [["a", "b"], ["x, y", 'say "hi"']];
  expect(parseCsv(toCsv(rows))).toEqual(rows);
});

test("the finished close passes every check on 3 fresh replay runs, with the same model notes", async () => {
  const { finish } = await import("../world/finished");
  const notes: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await finish(true);
    expect(r.passed).toBe(r.total);
    const note = readFileSync(join(r.folder, "out", "reconciliation-note.md"), "utf8");
    for (const inv of ["FD-2207", "FD-2204", "FD-2205", "FD-2206", "HL-873"]) expect(note).toContain(inv);
    notes.push(note + readFileSync(join(r.folder, "out", "reports", "monday-report.md"), "utf8"));
  }
  expect(new Set(notes).size).toBe(1);
}, 60000);
