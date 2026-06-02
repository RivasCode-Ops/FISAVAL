import type { Demanda, OrdemServico, Vistoria } from '@/types';
import { CHECKLIST_ITEMS } from '@/services/fisavalService';

function cell(value: string | number | boolean | undefined | null): string {
  const s = value == null ? '' : String(value);
  if (/[";"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV com separador `;` e BOM (Excel BR). */
export function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF';
  const body = rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildOrdensCsvRows(
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
    'Itens checklist OK',
  ];
  const rows = ordens.map((o) => {
    const v = vistoriaByOs.get(o.id);
    const checks = v
      ? CHECKLIST_ITEMS.filter((c) => v.checklist[c.id])
          .map((c) => c.label)
          .join(' | ')
      : '';
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
      checks,
    ];
  });
  return [header, ...rows];
}

export function buildDemandasCsvRows(demandas: Demanda[]): string[][] {
  const header = ['ID', 'Tipo', 'Bairro', 'Prioridade', 'Prazo', 'Status', 'Endereço', 'Inscrição', 'Lat', 'Lng'];
  const rows = demandas.map((d) => [
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
  ]);
  return [header, ...rows];
}

export type RelatorioPayload = {
  geradoEm: string;
  kpis: { osHoje: number; concluidas: number; homolog: number; divergencias: number };
  ordens: OrdemServico[];
  homologQueue: OrdemServico[];
  vistoriaByOs: Map<string, Vistoria>;
};

export function printRelatorio(data: RelatorioPayload) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    alert('Permita pop-ups para imprimir o relatório.');
    return;
  }

  const homologRows = data.homologQueue
    .map((o) => {
      const v = data.vistoriaByOs.get(o.id);
      return `<tr>
        <td>${o.id}</td><td>${o.inscricao}</td><td>${o.fiscalNome}</td>
        <td>${v?.divergencia ? 'Sim' : 'Não'}</td>
        <td>${v?.concluidaAt ? new Date(v.concluidaAt).toLocaleString('pt-BR') : '—'}</td>
      </tr>`;
    })
    .join('');

  const ordemRows = data.ordens
    .map(
      (o) =>
        `<tr><td>${o.id}</td><td>${o.fiscalNome}</td><td>${o.bairro}</td><td>${o.status}</td><td>${o.rotaOrdem}</td></tr>`,
    )
    .join('');

  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8"/><title>FISAVAL — Relatório</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #111; }
  h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
  .meta { color: #555; font-size: 0.85rem; margin-bottom: 1rem; }
  .kpis { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .kpi { border: 1px solid #ccc; padding: 0.5rem 1rem; border-radius: 6px; }
  .kpi strong { display: block; font-size: 1.25rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 1rem; }
  th, td { border: 1px solid #ddd; padding: 0.35rem 0.5rem; text-align: left; }
  th { background: #f0f0f0; }
  h2 { font-size: 1rem; margin: 1rem 0 0.5rem; }
  @media print { body { margin: 0.75rem; } }
</style></head><body>
<h1>FISAVAL — Relatório operacional</h1>
<p class="meta">Gerado em ${data.geradoEm}</p>
<div class="kpis">
  <div class="kpi"><strong>${data.kpis.osHoje}</strong>OS ref.</div>
  <div class="kpi"><strong>${data.kpis.concluidas}</strong>Em fluxo</div>
  <div class="kpi"><strong>${data.kpis.homolog}</strong>Homolog. pend.</div>
  <div class="kpi"><strong>${data.kpis.divergencias}</strong>Divergências</div>
</div>
<h2>Fila de homologação</h2>
<table><thead><tr><th>OS</th><th>Inscrição</th><th>Fiscal</th><th>Divergência</th><th>Concluída</th></tr></thead>
<tbody>${homologRows || '<tr><td colspan="5">Nenhuma</td></tr>'}</tbody></table>
<h2>Ordens de serviço (${data.ordens.length})</h2>
<table><thead><tr><th>OS</th><th>Fiscal</th><th>Bairro</th><th>Status</th><th>Rota</th></tr></thead>
<tbody>${ordemRows}</tbody></table>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  w.document.close();
}
