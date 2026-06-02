import type { Demanda, OrdemServico, Vistoria } from './types.js';

function cell(value: string | number | boolean | undefined | null): string {
  const s = value == null ? '' : String(value);
  if (/[";"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: string[][]): string {
  const bom = '\uFEFF';
  const body = rows.map((r) => r.map(cell).join(';')).join('\r\n');
  return bom + body;
}

export function ordensCsvRows(
  ordens: OrdemServico[],
  vistoriaByOs: Map<string, Vistoria>,
): string[][] {
  const header = [
    'OS',
    'Demanda',
    'Fiscal',
    'Inscrição',
    'Endereço',
    'Bairro',
    'Status',
    'Rota',
    'Lat',
    'Lng',
    'Divergência',
    'Check-in',
    'Concluída',
  ];
  const rows = ordens.map((o) => {
    const v = vistoriaByOs.get(o.id);
    return [
      o.id,
      o.demandaId,
      o.fiscalNome,
      o.inscricao,
      o.endereco,
      o.bairro,
      o.status,
      String(o.rotaOrdem),
      String(o.lat),
      String(o.lng),
      v?.divergencia ? 'sim' : v ? 'não' : '',
      v?.checkInAt ?? '',
      v?.concluidaAt ?? '',
    ];
  });
  return [header, ...rows];
}

export function demandasCsvRows(demandas: Demanda[]): string[][] {
  const header = ['ID', 'Tipo', 'Bairro', 'Prioridade', 'Prazo', 'Status', 'Endereço', 'Inscrição', 'Lat', 'Lng'];
  return [
    header,
    ...demandas.map((d) => [
      d.id,
      d.tipo,
      d.bairro,
      d.prioridade,
      d.prazo,
      d.status,
      d.endereco ?? '',
      d.inscricao ?? '',
      String(d.lat),
      String(d.lng),
    ]),
  ];
}
