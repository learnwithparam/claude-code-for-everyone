// Print the text of every invoice PDF (uses pdftotext).
import { readdirSync } from "node:fs";
for (const f of readdirSync("invoices").filter((f) => f.endsWith(".pdf")).sort()) {
  const p = Bun.spawnSync(["pdftotext", "-layout", `invoices/${f}`, "-"]);
  console.log(`=== ${f}\n${p.stdout.toString()}`);
}
