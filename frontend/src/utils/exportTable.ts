/**
 * exportTable.ts
 * Generic CSV and Excel export utilities for table data.
 * Used by ReportsPage for all 3 report types.
 */

export interface ExportColumn {
  key: string;
  title: string;
  format?: (val: any) => string;
}

/** Export data as CSV and trigger browser download */
export function exportToCSV(data: any[], filename: string, columns: ExportColumn[]): void {
  const header = columns.map(c => `"${c.title}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      const formatted = c.format ? c.format(val) : (val ?? '');
      return `"${String(formatted).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvContent = [header, ...rows].join('\r\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename + '.csv');
}

/** Export data as Excel .xlsx and trigger browser download */
export async function exportToExcel(data: any[], filename: string, columns: ExportColumn[]): Promise<void> {
  // Dynamically import xlsx to avoid bundle bloat
  const XLSX = await import('xlsx');

  const header = columns.map(c => c.title);
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      return c.format ? c.format(val) : (val ?? '');
    })
  );

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto column widths
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.title.length + 4, 16) }));

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0B2347' } },
      alignment: { horizontal: 'center' }
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename + '.xlsx');
}

/** Print a table using window.print() with minimal styling */
export function printTable(data: any[], title: string, columns: ExportColumn[]): void {
  const header = columns.map(c => `<th>${c.title}</th>`).join('');
  const rows = data.map(row =>
    '<tr>' + columns.map(c => {
      const val = row[c.key];
      const formatted = c.format ? c.format(val) : (val ?? '');
      return `<td>${formatted}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h2 { color: #0B2347; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th { background: #0B2347; color: #fff; padding: 8px 12px; text-align: left; }
    td { border-bottom: 1px solid #eee; padding: 7px 12px; }
    tr:nth-child(even) { background: #f8f9fc; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <p style="color:#888; font-size:11px; margin-bottom:12px;">Generated: ${new Date().toLocaleString('en-IN')} | Hisob ERP</p>
  <table>
    <thead><tr>${header}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function() { setTimeout(window.print, 300); };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1000,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
