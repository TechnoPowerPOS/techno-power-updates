export const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || !rows.length) {
        alert("لا توجد بيانات للتصدير.");
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        '\uFEFF' + // UTF-8 BOM for Excel compatibility with Arabic
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
                cell = cell instanceof Date
                    ? cell.toLocaleString('en-GB')
                    : typeof cell === 'object'
                    ? JSON.stringify(cell).replace(/"/g, '""')
                    : String(cell).replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};