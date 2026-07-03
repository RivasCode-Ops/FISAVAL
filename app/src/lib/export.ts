import { labelAssinaturaModo } from '@/lib/vistoriaAssinatura';
import type { Demanda, FinalidadeVistoria, OrdemServico, Vistoria, VistoriaFoto } from '@/types';
import { FOTOS_IMOVEL_ROTEIRO } from '@/lib/pilotoLocal';
import { distanciaMetros, mapsSearchUrl } from '@/lib/rota';
import {
  checklistForFinalidade,
  formatDadosReferencia,
  labelFinalidade,
  resolveFinalidade,
  RESULTADO_LABELS,
} from '@/lib/finalidadeVistoria';

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
    'Tipo',
    'Prioridade',
    'Prazo',
    'Visita início',
    'Visita fim',
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
    const fin = resolveFinalidade(o);
    const checks = v
      ? checklistForFinalidade(fin)
          .filter((c) => v.checklist[c.id])
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
      o.tipo ?? '',
      o.prioridade ?? '',
      o.prazo ?? '',
      o.visitaInicio ?? '',
      o.visitaFim ?? '',
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
  const header = [
    'ID',
    'Finalidade',
    'Tipo',
    'Bairro',
    'Prioridade',
    'Prazo',
    'Status',
    'Endereço',
    'Inscrição',
    'Lat',
    'Lng',
  ];
  const rows = demandas.map((d) => [
    d.id,
    labelFinalidade(d.finalidade ?? d.tipo),
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

export function buildRelatorioHtml(data: RelatorioPayload): string {
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

  return `<!DOCTYPE html><html lang="pt-BR"><head>
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
</body></html>`;
}

export function printRelatorio(data: RelatorioPayload): string {
  return buildRelatorioHtml(data);
}

export type LaudoFotoItem = VistoriaFoto & { url?: string };

export type LaudoHomologacaoPayload = {
  os: OrdemServico;
  vistoria: Vistoria;
  finalidade?: FinalidadeVistoria;
  dadosReferencia?: Record<string, string> | null;
  assinaturaUrl?: string | null;
  municipio?: string;
  tenantId?: string;
  geradoEm: string;
  fotos?: LaudoFotoItem[];
};

/** Laudo imprimível de uma OS em homologação (com assinatura do fiscal). */
export function buildLaudoHtml(data: LaudoHomologacaoPayload): string {
  const fin = data.finalidade ?? resolveFinalidade(data.os);
  const refText = formatDadosReferencia(fin, data.dadosReferencia ?? data.os.dadosReferencia);
  const resultadoText = data.vistoria.resultadoConferencia
    ? RESULTADO_LABELS[data.vistoria.resultadoConferencia]
    : data.vistoria.divergencia
      ? 'Divergente (legado)'
      : '—';
  const checks = checklistForFinalidade(fin)
    .filter((c) => data.vistoria.checklist[c.id])
    .map((c) => c.label)
    .join(', ');
  const certificada =
    data.vistoria.assinaturaModo === 'icp' || data.vistoria.assinaturaModo === 'govbr';
  const assinaturaBlock = certificada
    ? `<p><strong>${labelAssinaturaModo(data.vistoria)}</strong></p><p style="font-size:0.85rem;color:#555">Assinatura digital certificada (sem imagem PNG).</p>`
    : data.assinaturaUrl
      ? `<img src="${data.assinaturaUrl}" alt="Assinatura" style="max-width:280px;border:1px solid #ccc;border-radius:4px"/>`
      : '<p style="color:#888">Assinatura não disponível neste dispositivo.</p>';
  const meta = [data.municipio, data.tenantId].filter(Boolean).join(' · ');
  const refCoords =
    data.os.lat != null && data.os.lng != null
      ? `${data.os.lat.toFixed(5)}, ${data.os.lng.toFixed(5)}`
      : '—';
  const refLink =
    data.os.lat != null && data.os.lng != null
      ? ` · <a href="${mapsSearchUrl(data.os.lat, data.os.lng)}" target="_blank" rel="noreferrer">Google Maps</a>`
      : '';
  const hasCheckIn =
    data.vistoria.checkInLat != null && data.vistoria.checkInLng != null;
  let checkInPresenca = 'Não registrado';
  if (hasCheckIn) {
    const lat = data.vistoria.checkInLat!;
    const lng = data.vistoria.checkInLng!;
    const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const link = `<a href="${mapsSearchUrl(lat, lng)}" target="_blank" rel="noreferrer">Google Maps</a>`;
    const when = data.vistoria.checkInAt
      ? new Date(data.vistoria.checkInAt).toLocaleString('pt-BR')
      : '';
    const acc =
      data.vistoria.checkInAccuracyM != null
        ? ` (±${Math.round(data.vistoria.checkInAccuracyM)} m)`
        : '';
    let dist = '';
    if (data.os.lat != null && data.os.lng != null) {
      const d = distanciaMetros({ lat: data.os.lat, lng: data.os.lng }, { lat, lng });
      dist = ` · ~${Math.round(d)} m do imóvel`;
    }
    checkInPresenca = `${coords}${acc}${when ? ` · ${when}` : ''}${dist} · ${link}`;
  }
  const fotoItems = data.fotos ?? [];
  const fotosResumo =
    fotoItems.length === 0
      ? 'Nenhuma foto registrada nesta vistoria.'
      : `${fotoItems.length} foto(s) registrada(s).`;
  const fotosTabela =
    fotoItems.length > 0
      ? `<table class="foto-table">
  <thead><tr><th>Nº</th><th>Legenda</th><th>Data/hora</th><th>Arquivo</th></tr></thead>
  <tbody>${fotoItems
    .map((f, i) => {
      const legenda =
        f.legenda ?? FOTOS_IMOVEL_ROTEIRO[i] ?? `Evidência ${i + 1}`;
      const quando = new Date(f.createdAt).toLocaleString('pt-BR');
      return `<tr><td>${i + 1}</td><td>${legenda}</td><td>${quando}</td><td>${f.filename}</td></tr>`;
    })
    .join('')}</tbody>
</table>`
      : '';
  const fotosAnexo =
    fotoItems.filter((f) => f.url).length > 0
      ? `<div class="foto-grid">${fotoItems
          .map((f, i) => {
            if (!f.url) return '';
            const legenda =
              f.legenda ?? FOTOS_IMOVEL_ROTEIRO[i] ?? `Evidência ${i + 1}`;
            return `<figure style="margin:0"><figcaption style="font-size:0.8rem;font-weight:600;margin-bottom:0.25rem">${i + 1}. ${legenda}</figcaption><img src="${f.url}" alt="${legenda}" style="width:100%;max-height:200px;object-fit:cover;border:1px solid #ccc;border-radius:4px"/></figure>`;
          })
          .filter(Boolean)
          .join('')}</div>`
      : '';
  const fotosBlock = `<div class="fotos">
  <h2 style="font-size:1rem;margin:1rem 0 0.5rem">Registro fotográfico do imóvel</h2>
  <p style="font-size:0.85rem;color:#555;margin:0 0 0.75rem">${fotosResumo}</p>
  ${fotosTabela}
  ${fotosAnexo}
</div>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8"/><title>Laudo ${data.os.id}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #111; max-width: 720px; }
  h1 { font-size: 1.2rem; margin: 0 0 0.25rem; }
  .meta { color: #555; font-size: 0.85rem; margin-bottom: 1rem; }
  dl { display: grid; grid-template-columns: 9rem 1fr; gap: 0.35rem 0.75rem; font-size: 0.9rem; }
  dt { color: #555; margin: 0; }
  dd { margin: 0; }
  .sig { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #ddd; }
  .foto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem; }
  .foto-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 0.75rem; }
  .foto-table th, .foto-table td { border: 1px solid #ddd; padding: 0.35rem 0.5rem; text-align: left; }
  .foto-table th { background: #f8fafc; }
  @media print { body { margin: 0.75rem; } .foto-grid { break-inside: avoid; } }
</style></head><body>
<h1>FISAVAL — Laudo de vistoria</h1>
<p class="meta">${meta ? `${meta}<br/>` : ''}Gerado em ${data.geradoEm}</p>
<dl>
  <dt>OS</dt><dd>${data.os.id}</dd>
  <dt>Finalidade</dt><dd>${labelFinalidade(fin)}</dd>
  <dt>Inscrição</dt><dd>${data.os.inscricao}</dd>
  <dt>Endereço</dt><dd>${data.os.endereco}</dd>
  <dt>Bairro</dt><dd>${data.os.bairro}</dd>
  <dt>Fiscal</dt><dd>${data.os.fiscalNome}</dd>
  <dt>Dados de referência</dt><dd>${refText}</dd>
  <dt>Resultado conferência</dt><dd>${resultadoText}</dd>
  ${data.vistoria.observacaoConferencia ? `<dt>Obs. conferência</dt><dd>${data.vistoria.observacaoConferencia}</dd>` : ''}
  <dt>Divergência</dt><dd>${data.vistoria.divergencia ? 'Sim' : 'Não'}</dd>
  <dt>Coord. referência (OS)</dt><dd>${refCoords}${refLink}</dd>
  <dt>Check-in de presença</dt><dd>${checkInPresenca}</dd>
  <dt>Concluída</dt><dd>${data.vistoria.concluidaAt ? new Date(data.vistoria.concluidaAt).toLocaleString('pt-BR') : '—'}</dd>
  <dt>Checklist</dt><dd>${checks || '—'}</dd>
  ${data.vistoria.justificativa ? `<dt>Justificativa</dt><dd>${data.vistoria.justificativa}</dd>` : ''}
</dl>
${fotosBlock}
<div class="sig">
  <p><strong>Assinatura do fiscal</strong>${data.vistoria.assinaturaNome ? ` — ${data.vistoria.assinaturaNome}` : ''}</p>
  ${assinaturaBlock}
</div>
</body></html>`;
}

export function printHomologacaoLaudo(data: LaudoHomologacaoPayload): string {
  return buildLaudoHtml(data);
}
