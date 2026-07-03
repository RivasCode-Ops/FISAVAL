/** Fim da vistoria — fluxo único; muda a referência conferida no imóvel. */
export type FinalidadeVistoria = 'IPTU' | 'ITBI' | 'OBRA' | 'DENUNCIA' | 'RECADASTRAMENTO';
export const FINALIDADES: FinalidadeVistoria[] = ['IPTU', 'ITBI', 'OBRA', 'DENUNCIA', 'RECADASTRAMENTO'];
export const FINALIDADE_LABELS: Record<FinalidadeVistoria, string> = {
  IPTU: 'IPTU / avaliação cadastral',
  ITBI: 'ITBI / transmissão',
  OBRA: 'Obra / averbação',
  DENUNCIA: 'Denúncia',
  RECADASTRAMENTO: 'Recadastramento',
};
export type ResultadoConferencia = 'de_acordo' | 'divergente' | 'parcial';
export const RESULTADO_LABELS: Record<ResultadoConferencia, string> = {
  de_acordo: 'De acordo com os dados de referência',
  divergente: 'Divergente dos dados de referência',
  parcial: 'Conferência parcial / diligência',
};
export type RefFieldDef = { key: string; label: string };
export const REFERENCIA_FIELDS: Record<FinalidadeVistoria, RefFieldDef[]> = {
  IPTU: [
    { key: 'inscricaoRef', label: 'Inscrição cadastral' },
    { key: 'areaCadastrada', label: 'Área cadastrada (m²)' },
    { key: 'usoCadastrado', label: 'Uso cadastrado' },
    { key: 'padraoCadastrado', label: 'Padrão construtivo' },
  ],
  ITBI: [
    { key: 'guiaProcesso', label: 'Nº guia / processo ITBI' },
    { key: 'enderecoDocumento', label: 'Endereço no documento' },
    { key: 'areaDeclarada', label: 'Área declarada (m²)' },
    { key: 'valorDeclarado', label: 'Valor declarado (opc.)' },
  ],
  OBRA: [
    { key: 'alvara', label: 'Nº alvará' },
    { key: 'areaLicenciada', label: 'Área licenciada (m²)' },
    { key: 'etapaAutorizada', label: 'Etapa autorizada' },
    { key: 'resumoProjeto', label: 'Resumo do projeto' },
  ],
  DENUNCIA: [
    { key: 'motivoDenuncia', label: 'Motivo da denúncia' },
    { key: 'referenciaDenuncia', label: 'Referência / protocolo' },
  ],
  RECADASTRAMENTO: [
    { key: 'inscricaoRef', label: 'Inscrição' },
    { key: 'dadosAnteriores', label: 'Dados anteriores a conferir' },
  ],
};
export type CheckItem = { id: string; label: string };
export const CHECKLIST_COMUM: CheckItem[] = [
  { id: 'localizado', label: 'Imóvel localizado no endereço' },
  { id: 'estado_imovel', label: 'Estado do imóvel registrado (fotos)' },
  { id: 'conferencia_ref', label: 'Conferência com dados de referência realizada' },
];
export const CHECKLIST_POR_FINALIDADE: Record<FinalidadeVistoria, CheckItem[]> = {
  IPTU: [{ id: 'iptu_ficha', label: 'Área/uso constatados compatíveis com ficha cadastral' }],
  ITBI: [{ id: 'itbi_guia', label: 'Corresponde ao imóvel da guia/escritura' }],
  OBRA: [
    { id: 'obra_execucao', label: 'Execução compatível com projeto/alvará' },
    { id: 'obra_area', label: 'Área em obra conferida vs licenciada' },
  ],
  DENUNCIA: [{ id: 'denuncia_fato', label: 'Fato denunciado verificado no local' }],
  RECADASTRAMENTO: [{ id: 'recad_dados', label: 'Dados de recadastramento conferidos' }],
};
export function checklistForFinalidade(finalidade: FinalidadeVistoria): CheckItem[] {
  return [...CHECKLIST_COMUM, ...CHECKLIST_POR_FINALIDADE[finalidade]];
}
export function labelFinalidade(f?: string | null): string {
  const key = (f ?? 'IPTU') as FinalidadeVistoria;
  return FINALIDADE_LABELS[key] ?? String(f ?? '—');
}
export function resolveFinalidade(d?: { finalidade?: FinalidadeVistoria; tipo?: string }): FinalidadeVistoria {
  if (d?.finalidade && FINALIDADES.includes(d.finalidade)) return d.finalidade;
  return finalidadeFromTipo(d?.tipo);
}
export function finalidadeFromTipo(tipo?: string): FinalidadeVistoria {
  const t = (tipo ?? '').trim().toLowerCase();
  if (t.includes('itbi')) return 'ITBI';
  if (t.includes('obra') || t.includes('averba')) return 'OBRA';
  if (t.includes('denuncia') || t.includes('denúncia')) return 'DENUNCIA';
  if (t.includes('recadastramento')) return 'RECADASTRAMENTO';
  return 'IPTU';
}
export function formatDadosReferencia(finalidade: FinalidadeVistoria, dados?: Record<string, string> | null): string {
  if (!dados || !Object.keys(dados).length) return '—';
  return REFERENCIA_FIELDS[finalidade]
    .map((f) => {
      const v = dados[f.key]?.trim();
      return v ? `${f.label}: ${v}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}
export function emptyReferencia(finalidade: FinalidadeVistoria): Record<string, string> {
  const o: Record<string, string> = {};
  for (const f of REFERENCIA_FIELDS[finalidade]) o[f.key] = '';
  return o;
}
export function divergenciaFromResultado(r?: ResultadoConferencia): boolean {
  return r === 'divergente' || r === 'parcial';
}
