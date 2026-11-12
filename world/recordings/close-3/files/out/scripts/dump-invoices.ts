// Print the text of every invoice PDF (read only).
import { readdirSync } from "node:fs";

for (const f of readdirSync("invoices").filter((n) => n.endsWith(".pdf")).sort()) {
  const r = Bun.spawnSync(["pdftotext", "-layout", `invoices/${f}`, "-"]);
  console.log(`=== ${f}\n${r.stdout.toString()}`);
}
