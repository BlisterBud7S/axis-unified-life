export type DocSectionKind = "paragraphs" | "bullets" | "numbered" | "keyvalue" | "callout" | "table";

export type DocSection = {
  heading: string;
  kind: DocSectionKind;
  /** Paragraphs / bullets / numbered items, or "Label | Value" rows for keyvalue and table. */
  lines: string[];
};

export type DocSpec = {
  title: string;
  subtitle: string;
  summary: string;
  sections: DocSection[];
  footer: string;
};

const NAVY = { r: 10, g: 15, b: 30 };
const BLUE = { r: 59, g: 130, b: 246 };
const INK = { r: 24, g: 30, b: 44 };
const MUTED = { r: 105, g: 115, b: 135 };
const SOFT = { r: 239, g: 243, b: 250 };

export function docFileName(spec: DocSpec) {
  const slug =
    spec.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "axis-document";
  return `${slug}.pdf`;
}

/** Render a DocSpec into a polished A4 PDF and trigger a download. Browser only. */
export async function downloadDocPdf(spec: DocSpec) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const CW = W - M * 2;
  let y = 0;
  let page = 1;

  const setInk = (c: typeof INK) => doc.setTextColor(c.r, c.g, c.b);

  function footer() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setInk(MUTED);
    doc.text(spec.title.slice(0, 70), M, H - 28);
    doc.text(String(page), W - M, H - 28, { align: "right" });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(M, H - 42, W - M, H - 42);
  }

  function newPage() {
    footer();
    doc.addPage();
    page += 1;
    y = M + 8;
  }

  function room(h: number) {
    if (y + h > H - 64) newPage();
  }

  function wrapped(text: string, size: number, style: "normal" | "bold" | "italic", lh: number, indent = 0) {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, CW - indent) as string[];
    for (const line of lines) {
      room(lh);
      doc.text(line, M + indent, y);
      y += lh;
    }
  }

  // ---- Header band
  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(0, 0, W, 168, "F");
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(0, 164, W, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
  doc.text("A X I S", M, 58);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(spec.title, CW) as string[];
  let ty = 96;
  for (const line of titleLines.slice(0, 2)) {
    doc.text(line, M, ty);
    ty += 30;
  }

  if (spec.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(160, 174, 196);
    doc.text((doc.splitTextToSize(spec.subtitle, CW) as string[])[0] ?? "", M, Math.min(ty + 2, 150));
  }

  y = 208;

  // ---- Summary
  if (spec.summary) {
    doc.setFillColor(SOFT.r, SOFT.g, SOFT.b);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const sl = doc.splitTextToSize(spec.summary, CW - 32) as string[];
    const h = sl.length * 16 + 28;
    doc.roundedRect(M, y - 14, CW, h, 8, 8, "F");
    doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    doc.rect(M, y - 14, 3, h, "F");
    setInk(INK);
    let sy = y + 4;
    for (const line of sl) {
      doc.text(line, M + 18, sy);
      sy += 16;
    }
    y = y - 14 + h + 26;
  }

  // ---- Sections
  for (const section of spec.sections) {
    room(56);
    if (y > M + 24) y += 8;
    if (section.heading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      setInk(NAVY);
      const hl = doc.splitTextToSize(section.heading, CW) as string[];
      for (const line of hl) {
        room(20);
        doc.text(line, M, y);
        y += 18;
      }
      doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
      doc.setLineWidth(1.4);
      doc.line(M, y - 8, M + 34, y - 8);
      y += 10;
    }

    const lines = section.lines.filter((l) => l && l.trim().length > 0);

    if (section.kind === "paragraphs") {
      for (const p of lines) {
        setInk(INK);
        wrapped(p, 10.5, "normal", 15);
        y += 8;
      }
    } else if (section.kind === "bullets" || section.kind === "numbered") {
      lines.forEach((item, i) => {
        room(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
        doc.text(section.kind === "bullets" ? "•" : `${i + 1}.`, M + 2, y);
        setInk(INK);
        wrapped(item, 10.5, "normal", 15, 22);
        y += 4;
      });
      y += 6;
    } else if (section.kind === "keyvalue" || section.kind === "table") {
      const rows = lines.map((l) => l.split("|").map((c) => c.trim()));
      const cols = Math.max(...rows.map((r) => r.length), 1);
      const colW = CW / cols;
      rows.forEach((row, i) => {
        const cells = row.map((c) => doc.splitTextToSize(c, colW - 16) as string[]);
        const rowH = Math.max(...cells.map((c) => c.length)) * 14 + 10;
        room(rowH);
        const header = section.kind === "table" && i === 0;
        if (header) doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
        else if (i % 2 === 1) doc.setFillColor(SOFT.r, SOFT.g, SOFT.b);
        if (header || i % 2 === 1) doc.rect(M, y - 12, CW, rowH, "F");
        cells.forEach((cell, ci) => {
          doc.setFont("helvetica", header || (section.kind === "keyvalue" && ci === 0) ? "bold" : "normal");
          doc.setFontSize(10);
          if (header) doc.setTextColor(255, 255, 255);
          else setInk(ci === 0 ? NAVY : INK);
          cell.forEach((line, li) => doc.text(line, M + ci * colW + 8, y + li * 14));
        });
        y += rowH;
      });
      y += 14;
    } else {
      // callout
      const text = lines.join(" ");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10.5);
      const cl = doc.splitTextToSize(text, CW - 34) as string[];
      const h = cl.length * 15 + 24;
      room(h + 8);
      doc.setFillColor(235, 244, 255);
      doc.roundedRect(M, y - 14, CW, h, 8, 8, "F");
      doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
      doc.rect(M, y - 14, 3, h, "F");
      setInk(INK);
      let cy = y + 2;
      for (const line of cl) {
        doc.text(line, M + 18, cy);
        cy += 15;
      }
      y = y - 14 + h + 24;
    }
  }

  if (spec.footer) {
    room(40);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(M, y - 4, W - M, y - 4);
    y += 14;
    setInk(MUTED);
    wrapped(spec.footer, 9, "italic", 13);
  }

  footer();
  doc.save(docFileName(spec));
}
