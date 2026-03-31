export const downloadCsvFile = (rows, filename = 'export.csv') => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escapeValue = (value) => {
    const normalized = value == null ? '' : String(value).replace(/\r?\n/g, ' ');
    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const csv = [
    headers.map(escapeValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeValue(row?.[header] ?? '')).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const safeFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;

  link.href = URL.createObjectURL(blob);
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
