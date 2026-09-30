/** Parse bulk server CSV: host/ip, username, password, optional name. */

export type BulkServerRow = {
  line: number;
  host: string;
  username: string;
  password: string;
  name: string;
};

export const BULK_IMPORT_SAMPLE_CSV = `host,username,password,name
192.168.1.100,root,YourPasswordHere,Lab-R740-01
idrac-dc2.example.com,root,YourPasswordHere,
10.0.0.50,root,YourPasswordHere,DRAC-Edge-50
`;

export function downloadSampleCsv() {
  const blob = new Blob([BULK_IMPORT_SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'uidrac-servers-import-sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseBulkServerCsv(text: string): { rows: BulkServerRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (lines.length === 0) {
    return { rows: [], errors: ['CSV is empty.'] };
  }

  const headerCells = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const hostIdx = headerCells.findIndex((h) => h === 'host' || h === 'ip' || h === 'hostname' || h === 'idrac');
  const userIdx = headerCells.findIndex((h) => h === 'username' || h === 'user');
  const passIdx = headerCells.findIndex((h) => h === 'password' || h === 'pass');
  const nameIdx = headerCells.findIndex((h) => h === 'name' || h === 'displayname' || h === 'servername');

  if (hostIdx < 0 || userIdx < 0 || passIdx < 0) {
    return {
      rows: [],
      errors: ['Header must include host (or ip), username, and password columns.'],
    };
  }

  const rows: BulkServerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const host = cells[hostIdx]?.trim() ?? '';
    const username = cells[userIdx]?.trim() ?? '';
    const password = cells[passIdx] ?? '';
    const name = nameIdx >= 0 ? (cells[nameIdx]?.trim() ?? '') : '';
    if (!host && !username && !password) continue;
    if (!host || !username || !password) {
      errors.push(`Line ${i + 1}: host, username, and password are required.`);
      continue;
    }
    rows.push({ line: i + 1, host, username, password, name });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No data rows found after header.');
  }

  return { rows, errors };
}
