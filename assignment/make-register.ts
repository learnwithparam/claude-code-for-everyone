// Writes assignment/starter/invoices.csv: one row for each supplier bill in the bakery folder.
// It reads the text inside each invoice PDF. The columns are the ones DuckDB needs to join on.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const INVOICES = join(import.meta.dir, "..", "world", "seed", "wren-street", "invoices");
const REGISTER = join(import.meta.dir, "starter", "invoices.csv");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function field(pdfText: string, label: string): string {
  const found = pdfText.match(new RegExp(`\\(${label}: ([^)]*)\\)`));
  if (!found) throw new Error(`no "${label}" in an invoice`);
  return found[1];
}

function isoDate(written: string): string {
  const [day, month, year] = written.split(" ");
  const monthNumber = String(MONTHS.indexOf(month) + 1).padStart(2, "0");
  return `${year}-${monthNumber}-${day.padStart(2, "0")}`;
}

function registerRow(file: string): string {
  const pdfText = readFileSync(join(INVOICES, file), "latin1");
  const line = pdfText.match(/\((?:[a-z ]+?)\s+(\d+)\s+GBP ([\d.]+)\s+GBP ([\d.]+)\)/);
  if (!line) throw new Error(`no item line in ${file}`);
  const [, quantity, unitPrice, total] = line;
  const date = isoDate(field(pdfText, "Invoice date"));
  const columns = [field(pdfText, "Invoice number"), date, field(pdfText, "Your order")];
  return [...columns, quantity, unitPrice, total].join(",");
}

const header = "invoice,invoice_date,po,quantity,unit_price,total";
const rows = readdirSync(INVOICES)
  .filter((file) => file.endsWith(".pdf"))
  .sort()
  .map(registerRow);
writeFileSync(REGISTER, `${[header, ...rows].join("\n")}\n`);
console.log(`Wrote ${rows.length} bills to assignment/starter/invoices.csv`);
