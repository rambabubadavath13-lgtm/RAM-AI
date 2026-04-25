// Build CSV string from rows. Quotes/commas/newlines safely escaped.
const csvEscape = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const rowsToCsv = (headers, rows) => {
  const head = headers.map(csvEscape).join(",");
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return `${head}\n${body}\n`;
};

export const downloadCsv = (filename, headers, rows) => {
  // Excel-friendly UTF-8 BOM so accented chars render correctly when opened directly.
  const csv = "\uFEFF" + rowsToCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  // target=_blank helps in iframe / preview contexts where same-frame downloads
  // are blocked by the browser.
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
};
