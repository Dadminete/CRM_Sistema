import * as XLSX from "xlsx";

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: (value: any) => any;
}

export interface ExportOptions {
  sheetName?: string;
  filename: string;
}

/**
 * Export data to Excel file
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  options: ExportOptions,
): Uint8Array {
  // Transform data according to columns
  const transformedData = data.map((row) => {
    const transformedRow: Record<string, any> = {};
    columns.forEach((col) => {
      const value = row[col.key];
      transformedRow[col.header] = col.format ? col.format(value) : value;
    });
    return transformedRow;
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // Set column widths
  const columnWidths: XLSX.ColInfo[] = columns.map((col) => ({
    wch: col.width || 15,
  }));
  worksheet["!cols"] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || "Data");

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new Uint8Array(excelBuffer);
}

/**
 * Format date for Excel
 */
export function formatDateForExcel(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES");
  } catch {
    return dateStr;
  }
}

/**
 * Format datetime for Excel
 */
export function formatDateTimeForExcel(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("es-ES");
  } catch {
    return dateStr;
  }
}

/**
 * Format currency for Excel
 */
export function formatCurrencyForExcel(value: number | string | null): string {
  if (value === null || value === undefined) return "";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return `$${numValue.toFixed(2)}`;
}

/**
 * Format boolean for Excel
 */
export function formatBooleanForExcel(value: boolean | null): string {
  if (value === null || value === undefined) return "";
  return value ? "Sí" : "No";
}
