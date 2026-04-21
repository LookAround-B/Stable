export const loadXLSX = async () => {
  const module = await import('xlsx');
  return module.default || module;
};

export const writeRowsToXlsx = async (
  rows,
  { sheetName = 'Sheet1', fileName = 'export.xlsx', columnWidths } = {}
) => {
  const XLSX = await loadXLSX();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (columnWidths) {
    worksheet['!cols'] = columnWidths;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};
