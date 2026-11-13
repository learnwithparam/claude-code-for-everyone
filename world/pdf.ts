// A one-page text PDF with no library: enough for a supplier invoice that Claude can read.

type PdfLine = { text: string; size?: number; bold?: boolean };

// Text in a PDF sits inside brackets, so a bracket or backslash in it needs a backslash first.
function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// One drawing command for each line, working down the page from the top.
function drawLines(lines: PdfLine[]): string {
  let baseline = 790;
  const commands: string[] = [];
  for (const line of lines) {
    const size = line.size ?? 11;
    baseline -= size + 7;
    const font = line.bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf 56 ${baseline} Td (${escapePdfText(line.text)}) Tj ET`);
  }
  return commands.join("\n");
}

export function textPdf(lines: PdfLine[]): Uint8Array {
  const content = drawLines(lines);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R " +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  // A PDF reader finds each object by its byte position, listed in the table at the end.
  const positions: number[] = [];
  objects.forEach((object, i) => {
    positions.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const tableStart = pdf.length;
  const tableRows = positions.map((position) => `${String(position).padStart(10, "0")} 00000 n \n`);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${tableRows.join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${tableStart}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
