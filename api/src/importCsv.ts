import type { Prioridade } from './types.js';

export type ImportRow = {
  inscricao?: string;
  endereco?: string;
  bairro: string;
  tipo: string;
  prioridade: Prioridade;
  prazo: string;
  lat?: number;
  lng?: number;
};

function detectDelimiter(headerLine: string): string {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi >= comma ? ';' : ',';
}

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === delim) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

const defaultPrazo = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

export function parseDemandasCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ['Arquivo vazio'] };

  const delim = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delim).map(normHeader);
  const idx = (name: string) => headers.indexOf(normHeader(name));

  const iBairro = idx('bairro');
  if (iBairro < 0) return { rows: [], errors: ['Coluna obrigatória: bairro'] };

  const iInsc = idx('inscricao');
  const iEnd = idx('endereco');
  const iTipo = idx('tipo');
  const iPri = idx('prioridade');
  const iPrazo = idx('prazo');
  const iLat = idx('lat');
  const iLng = idx('lng');

  const rows: ImportRow[] = [];
  const errors: string[] = [];

  for (let n = 1; n < lines.length; n++) {
    const cols = parseLine(lines[n], delim);
    if (cols.every((c) => !c)) continue;
    const bairro = cols[iBairro]?.trim();
    if (!bairro) {
      errors.push(`Linha ${n + 1}: bairro vazio`);
      continue;
    }
    const pri = (cols[iPri]?.trim().toLowerCase() || 'media') as Prioridade;
    if (!['alta', 'media', 'baixa'].includes(pri)) {
      errors.push(`Linha ${n + 1}: prioridade inválida`);
      continue;
    }
    rows.push({
      bairro,
      inscricao: iInsc >= 0 ? cols[iInsc]?.trim() : undefined,
      endereco: iEnd >= 0 ? cols[iEnd]?.trim() : undefined,
      tipo: iTipo >= 0 && cols[iTipo]?.trim() ? cols[iTipo].trim() : 'Recadastramento',
      prioridade: pri,
      prazo: iPrazo >= 0 && cols[iPrazo]?.trim() ? cols[iPrazo].trim() : defaultPrazo(),
      lat: iLat >= 0 && cols[iLat] ? Number(cols[iLat].replace(',', '.')) : undefined,
      lng: iLng >= 0 && cols[iLng] ? Number(cols[iLng].replace(',', '.')) : undefined,
    });
  }

  return { rows, errors };
}
