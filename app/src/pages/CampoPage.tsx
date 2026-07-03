import { useCallback, useEffect, useState } from 'react';
import type { AssinaturaModo, OrdemServico, ResultadoConferencia, Vistoria } from '@/types';
import {
  checklistForFinalidade,
  formatDadosReferencia,
  REFERENCIA_FIELDS,
  resolveFinalidade,
  RESULTADO_LABELS,
} from '@/lib/finalidadeVistoria';
import { AssinaturaPanel } from '@/components/AssinaturaPanel';
import { RotaMap } from '@/components/RotaMap';
import { CoordLinks } from '@/components/CoordLinks';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { mapsDirUrl } from '@/lib/rota';
import { useAuthStore } from '@/store/authStore';
import type { VistoriaFoto } from '@/types';
import {
  concluirVistoria,
  getAssinaturaDisplayUrl,
  getFotoDisplayUrl,
  getOrCreateVistoria,
  hasAssinatura,
  registrarAssinaturaCertificada,
  saveAssinatura,
  listFotos,
  listOrdensFiscal,
  otimizarRotaFiscal,
  saveVistoria,
  syncPendentes,
  updateOsStatus,
  uploadFoto,
} from '@/services/fisavalService';
import { dentroJanelaVisita, formatJanela } from '@/lib/janela';
import { distanciaMetros, filtrarOsAtivas } from '@/lib/rota';
import { badgeClassStatusPrazo, calcPrazoOs } from '@/lib/prazoStatus';
import {
  capturePosition,
  formatCoords,
  watchPositionBrief,
  type GeoCapture,
} from '@/lib/geolocation';
import { getApiUrl, isApiMode } from '@/api/config';
import { getStoredTenantId } from '@/api/tenantStorage';
import { useNovasOsAlert } from '@/hooks/useNovasOsAlert';
import { subscribeWebPush } from '@/lib/push';
import {
  FOTOS_IMOVEL_ROTEIRO,
  MAX_FOTOS_PILOTO,
  PILOTO_LOCAL,
} from '@/lib/pilotoLocal';

export function CampoPage() {
  const session = useAuthStore((s) => s.session)!;
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [selected, setSelected] = useState<OrdemServico | null>(null);
  const [vistoria, setVistoria] = useState<Vistoria | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [msg, setMsg] = useState('');
  const [fotos, setFotos] = useState<VistoriaFoto[]>([]);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});
  const [pushMsg, setPushMsg] = useState('');
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null);
  const [rotaResumo, setRotaResumo] = useState<string | null>(null);
  const [checkinRadiusM, setCheckinRadiusM] = useState(200);
  const [assinaturaModos, setAssinaturaModos] = useState<AssinaturaModo[]>(['canvas']);
  const [assinaturaPadrao, setAssinaturaPadrao] = useState<AssinaturaModo>('canvas');
  const [observacaoConferencia, setObservacaoConferencia] = useState('');
  const [userPosition, setUserPosition] = useState<GeoCapture | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);

  const finalidadeOs = selected ? resolveFinalidade(selected) : 'IPTU';
  const checklistItems = checklistForFinalidade(finalidadeOs);

  useNovasOsAlert(ordens.length, true);

  useEffect(() => {
    const base = getApiUrl();
    if (!base) return;
    const tid = getStoredTenantId();
    void fetch(`${base}/api/fisaval/config`, { headers: tid ? { 'X-Tenant-Id': tid } : {} })
      .then((r) => r.json())
      .then(
        (c: {
          checkinRadiusM?: number;
          assinaturaModos?: AssinaturaModo[];
          assinaturaPadrao?: AssinaturaModo;
        }) => {
          if (c.checkinRadiusM != null) setCheckinRadiusM(c.checkinRadiusM);
          if (c.assinaturaModos?.length) setAssinaturaModos(c.assinaturaModos);
          if (c.assinaturaPadrao) setAssinaturaPadrao(c.assinaturaPadrao);
        },
      )
      .catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    const list = await listOrdensFiscal(session.userId);
    setOrdens(list);
    if (!selected && list[0]) setSelected(list[0]);
  }, [session.userId, selected]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selected) return;
    void (async () => {
      const v = await getOrCreateVistoria(selected.id);
      setVistoria(v);
      setJustificativa(v.justificativa ?? '');
      setObservacaoConferencia(v.observacaoConferencia ?? '');
      const list = await listFotos(v.id);
      setFotos(list);
      const urls: Record<string, string> = {};
      for (const f of list) {
        const url = await getFotoDisplayUrl(f.id);
        if (url) urls[f.id] = url;
      }
      setFotoUrls(urls);
      setAssinaturaUrl(await getAssinaturaDisplayUrl(v.id));
    })();
  }, [selected?.id]);

  useEffect(() => {
    const stop = watchPositionBrief((pos) => setUserPosition(pos), 12_000);
    return stop;
  }, [selected?.id]);

  function showMsg(text: string, isError = false) {
    setMsg(text);
    setMsgIsError(isError);
  }

  async function compressImage(file: File, maxEdge = 1280): Promise<Blob> {
    if (!file.type.startsWith('image/') || file.size < 400_000) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82),
    );
    return blob ?? file;
  }

  async function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vistoria) return;
    if (PILOTO_LOCAL && fotos.length >= MAX_FOTOS_PILOTO) {
      showMsg(`Máximo de ${MAX_FOTOS_PILOTO} fotos por vistoria no piloto.`, true);
      e.target.value = '';
      return;
    }
    const blob = PILOTO_LOCAL ? await compressImage(file) : file;
    const uploadFile =
      blob instanceof File ? blob : new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
    const legenda =
      fotos.length < FOTOS_IMOVEL_ROTEIRO.length
        ? FOTOS_IMOVEL_ROTEIRO[fotos.length]
        : `Evidência ${fotos.length + 1}`;
    const foto = await uploadFoto(vistoria.id, uploadFile, legenda);
    if (foto) {
      setFotos((prev) => [...prev, foto]);
      const url = await getFotoDisplayUrl(foto.id);
      if (url) setFotoUrls((prev) => ({ ...prev, [foto.id]: url }));
      showMsg(navigator.onLine && isApiMode() ? 'Foto enviada.' : 'Foto salva no aparelho (sincronize depois).');
    }
    e.target.value = '';
  }

  async function checkIn() {
    if (!selected || !vistoria) return;
    const result = await capturePosition();
    if (!result.ok) {
      showMsg(result.message, true);
      return;
    }
    const { lat, lng, accuracyM } = result.position;
    setUserPosition(result.position);
    const distM = distanciaMetros({ lat: selected.lat, lng: selected.lng }, { lat, lng });
    await updateOsStatus(selected.id, 'check_in');
    await saveVistoria(vistoria.id, {
      checkInAt: new Date().toISOString(),
      checkInLat: lat,
      checkInLng: lng,
      checkInAccuracyM: accuracyM,
    });
    await updateOsStatus(selected.id, 'em_vistoria');
    let texto = `Check-in GPS: ${formatCoords(lat, lng)} (±${Math.round(accuracyM)} m).`;
    if (distM > checkinRadiusM) {
      texto += ` Atenção: você está a ~${Math.round(distM)} m do imóvel (raio esperado: ${checkinRadiusM} m).`;
      showMsg(texto, true);
    } else {
      showMsg(`${texto} Distância ao imóvel: ~${Math.round(distM)} m.`);
    }
    await reload();
    const v = await getOrCreateVistoria(selected.id);
    setVistoria(v);
  }

  async function toggleCheck(id: string, checked: boolean) {
    if (!vistoria) return;
    const checklist = { ...vistoria.checklist, [id]: checked };
    await saveVistoria(vistoria.id, { checklist });
    setVistoria({ ...vistoria, checklist });
  }

  async function onResultadoChange(r: ResultadoConferencia) {
    if (!vistoria) return;
    await saveVistoria(vistoria.id, { resultadoConferencia: r });
    const divergencia = r === 'divergente' || r === 'parcial';
    setVistoria({ ...vistoria, resultadoConferencia: r, divergencia });
  }

  async function onObservacaoBlur() {
    if (!vistoria) return;
    await saveVistoria(vistoria.id, { observacaoConferencia });
    setVistoria({ ...vistoria, observacaoConferencia });
  }

  async function concluir() {
    if (!selected || !vistoria) return;
    if (!(await hasAssinatura(vistoria.id))) {
      showMsg('Salve a assinatura antes de concluir a vistoria.', true);
      return;
    }
    await concluirVistoria(vistoria.id, selected.id);
    showMsg('Vistoria concluída — pendente de sincronização.');
    await reload();
  }

  async function interromper() {
    if (!selected) return;
    await updateOsStatus(selected.id, 'interrompida');
    if (vistoria) await saveVistoria(vistoria.id, { justificativa });
    setMsg('OS interrompida.');
    await reload();
  }

  async function sync() {
    const n = await syncPendentes(session.userId);
    showMsg(n ? `${n} item(ns) sincronizado(s) com o servidor.` : 'Nada pendente.');
    await reload();
  }

  async function otimizarRota() {
    const result = await capturePosition();
    const start = result.ok
      ? { lat: result.position.lat, lng: result.position.lng }
      : undefined;
    if (!result.ok) showMsg(result.message, true);
    const r = await otimizarRotaFiscal(session.userId, start);
    if (r.capacidadeRestante === 0) {
      setRotaResumo(null);
      showMsg('Capacidade diária de visitas esgotada.', true);
    } else if (r.paradas) {
      const motor =
        r.engine === 'vroom' ? 'VROOM' : r.engine === 'prazo-proximidade' ? 'prazo+GPS' : r.engine;
      const seq = r.tiposRota?.length ? ` · ${r.tiposRota.join(' → ')}` : '';
      setRotaResumo(`~${r.distanciaKm} km · ~${r.duracaoMinEst} min (${motor})${seq}`);
      showMsg(`Rota otimizada: ${r.paradas} parada(s).`);
    } else {
      setRotaResumo(null);
      showMsg('Nenhuma OS ativa para ordenar.');
    }
    await reload();
  }

  const rotaAtiva = filtrarOsAtivas(ordens);
  const checkInPosition =
    vistoria?.checkInLat != null && vistoria?.checkInLng != null
      ? { lat: vistoria.checkInLat, lng: vistoria.checkInLng }
      : undefined;
  const userMapPosition = userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : undefined;
  const hasReferencia =
    selected?.dadosReferencia &&
    Object.keys(selected.dadosReferencia).some((k) => selected.dadosReferencia![k]?.trim());

  return (
    <>
      <PageHeader
        title="Campo"
        description="Vistoria em campo: conferência, checklist, fotos e assinatura. Check-in GPS comprova presença no imóvel."
      />

      <div className="campo-layout">
        <div className="campo-layout__sidebar stack">
          <SectionCard title={`Minhas OS (${ordens.length})`}>
            <RotaMap
              ordens={rotaAtiva}
              selectedId={selected?.id}
              onSelect={setSelected}
              userPosition={userMapPosition}
              checkInPosition={selected?.id === vistoria?.osId ? checkInPosition : undefined}
            />
            {!PILOTO_LOCAL && (
              <>
                <button type="button" className="btn btn-outline btn-sm btn-block" onClick={() => void otimizarRota()}>
                  Otimizar rota (GPS)
                </button>
                {rotaResumo && <p className="muted">{rotaResumo}</p>}
              </>
            )}
            <div className="os-list">
              {ordens.map((o) => (
                <div
                  key={o.id}
                  className={`os-card ${selected?.id === o.id ? 'selected' : ''}`}
                  onClick={() => setSelected(o)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(o)}
                  role="button"
                  tabIndex={0}
                >
                  <strong>{o.id}</strong> — {o.inscricao}
                  <br />
                  <small>{o.endereco}</small>
                  <br />
                  <span className="badge b-status">#{o.rotaOrdem}</span>{' '}
                  {o.tipo && <span className="badge b-status">{o.tipo}</span>}{' '}
                  {o.prioridade && (
                    <span
                      className={`badge ${o.prioridade === 'alta' ? 'b-pri-alta' : o.prioridade === 'media' ? 'b-pri-media' : 'b-pri-baixa'}`}
                    >
                      {o.prioridade}
                    </span>
                  )}{' '}
                  {o.prazo && (() => {
                    const prazoOs = calcPrazoOs(o, selected?.id === o.id ? vistoria : undefined);
                    return (
                    <span className={`badge ${badgeClassStatusPrazo(prazoOs.statusPrazo)}`}>
                      {prazoOs.labelCurto}
                    </span>
                    );
                  })()}{' '}
                  {formatJanela(o.visitaInicio, o.visitaFim) && (
                    <span
                      className={`badge ${dentroJanelaVisita(o.visitaInicio, o.visitaFim) ? 'b-pri-baixa' : 'b-pri-media'}`}
                      title="Janela de visita"
                    >
                      {formatJanela(o.visitaInicio, o.visitaFim)}
                      {dentroJanelaVisita(o.visitaInicio, o.visitaFim) ? ' · agora' : ''}
                    </span>
                  )}{' '}
                  <span className="badge b-status">{o.status}</span>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-block" onClick={() => void sync()}>
              Sincronizar pendentes
            </button>
            {!PILOTO_LOCAL && isApiMode() && (
              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={() => {
                  void subscribeWebPush(['nova_os']).then((r) => {
                    const labels: Record<string, string> = {
                      ok: 'Alertas push ativados.',
                      denied: 'Permissão de notificação negada.',
                      'no-vapid': 'Push não configurado no servidor (VAPID).',
                      unsupported: 'Navegador sem suporte a push.',
                      error: 'Falha ao registrar push.',
                    };
                    setPushMsg(labels[r] ?? r);
                  });
                }}
              >
                Ativar alertas de nova OS
              </button>
            )}
            {pushMsg && <p className="muted">{pushMsg}</p>}
          </SectionCard>
        </div>

        {selected && (
          <div className="stack">
            <SectionCard title={selected.id} subtitle={selected.endereco}>
              {hasReferencia && (
                <details className="collapse-section">
                  <summary>Dados de referência</summary>
                  <div className="collapse-section__body info-panel">
                    <dl>
                      {REFERENCIA_FIELDS[finalidadeOs]
                        .filter((f) => selected.dadosReferencia![f.key]?.trim())
                        .map((f) => (
                          <div key={f.key}>
                            <dt>{f.label}</dt>
                            <dd>{selected.dadosReferencia![f.key]}</dd>
                          </div>
                        ))}
                    </dl>
                    <p className="muted">{formatDadosReferencia(finalidadeOs, selected.dadosReferencia)}</p>
                  </div>
                </details>
              )}

              <details className="collapse-section" open>
                <summary>Localização</summary>
                <div className="collapse-section__body">
                  <p className="muted">Evidência de presença (opcional até concluir conferência).</p>
                  <div className="cluster">
                    <a
                      className="btn btn-outline btn-sm"
                      href={mapsDirUrl(selected.lat, selected.lng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Navegar até o imóvel
                    </a>
                  </div>
                  <div className="info-panel">
                    <dl>
                      <div>
                        <dt>Imóvel (referência OS)</dt>
                        <dd>
                          <CoordLinks lat={selected.lat} lng={selected.lng} showCoords />
                        </dd>
                      </div>
                      <div>
                        <dt>Check-in GPS</dt>
                        <dd>
                          {vistoria?.checkInLat != null && vistoria?.checkInLng != null ? (
                            <CoordLinks lat={vistoria.checkInLat} lng={vistoria.checkInLng} showCoords />
                          ) : (
                            '— (ainda não registrado)'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Você agora</dt>
                        <dd>
                          {userPosition ? (
                            <>
                              {formatCoords(userPosition.lat, userPosition.lng)} (±{Math.round(userPosition.accuracyM)} m)
                              <br />
                              <CoordLinks lat={userPosition.lat} lng={userPosition.lng} />
                            </>
                          ) : (
                            'Obtendo posição…'
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <button type="button" className="btn btn-block" onClick={() => void checkIn()}>
                    {vistoria?.checkInAt ? 'Atualizar GPS (check-in)' : 'Check-in GPS'}
                  </button>
                  {vistoria?.checkInAt && (
                    <p className="muted">
                      Último check-in: {new Date(vistoria.checkInAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </details>

              <details className="collapse-section">
                <summary>Conferência</summary>
                <div className="collapse-section__body">
                  <label>Resultado da conferência</label>
                  <select
                    value={vistoria?.resultadoConferencia ?? ''}
                    onChange={(e) => void onResultadoChange(e.target.value as ResultadoConferencia)}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {(Object.keys(RESULTADO_LABELS) as ResultadoConferencia[]).map((k) => (
                      <option key={k} value={k}>
                        {RESULTADO_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <label>Observação da conferência (opcional)</label>
                  <textarea
                    rows={2}
                    value={observacaoConferencia}
                    onChange={(e) => setObservacaoConferencia(e.target.value)}
                    onBlur={() => void onObservacaoBlur()}
                  />
                  <div className="checklist">
                    {checklistItems.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={!!vistoria?.checklist[c.id]}
                          onChange={(e) => void toggleCheck(c.id, e.target.checked)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              </details>

              <details className="collapse-section">
                <summary>
                  Fotos do imóvel (opcional) — {fotos.length}/{MAX_FOTOS_PILOTO}
                </summary>
                <div className="collapse-section__body">
                  <ul className="foto-roteiro">
                    {FOTOS_IMOVEL_ROTEIRO.map((legenda, i) => (
                      <li key={legenda} className={fotos.length > i ? 'foto-roteiro--done' : undefined}>
                        {fotos.length > i ? '✓ ' : ''}
                        {legenda}
                      </li>
                    ))}
                  </ul>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={fotos.length >= MAX_FOTOS_PILOTO}
                    onChange={(e) => void onFotoChange(e)}
                  />
                  {fotos.length === 0 && (
                    <p className="muted">Sem fotos? Você pode concluir a vistoria mesmo assim.</p>
                  )}
                  {fotos.length > 0 && (
                    <div className="foto-grid">
                      {fotos.map((f) => (
                        <div key={f.id} className="foto-thumb">
                          {fotoUrls[f.id] ? (
                            <img src={fotoUrls[f.id]} alt={f.filename} />
                          ) : (
                            <span>{f.filename}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              <details className="collapse-section">
                <summary>Assinatura e conclusão</summary>
                <div className="collapse-section__body">
                  <AssinaturaPanel
                    nomeFiscal={session.nome}
                    modos={PILOTO_LOCAL ? ['canvas'] : assinaturaModos}
                    padrao={PILOTO_LOCAL ? 'canvas' : assinaturaPadrao}
                    initialUrl={assinaturaUrl}
                    certificadaModo={
                      vistoria?.assinaturaModo === 'icp' || vistoria?.assinaturaModo === 'govbr'
                        ? vistoria.assinaturaModo
                        : undefined
                    }
                    certificadaRef={vistoria?.assinaturaRef}
                    onSaveCanvas={(blob) => {
                      void saveAssinatura(vistoria!.id, session.nome, blob).then(async () => {
                        const v = await getOrCreateVistoria(selected!.id);
                        setVistoria(v);
                        setAssinaturaUrl(await getAssinaturaDisplayUrl(vistoria!.id));
                        showMsg('Assinatura salva.');
                      });
                    }}
                    onSaveCertificada={(modo) => {
                      void registrarAssinaturaCertificada(vistoria!.id, session.nome, modo).then((v) => {
                        if (v) setVistoria(v);
                        setAssinaturaUrl(null);
                        showMsg(`Assinatura ${modo === 'icp' ? 'ICP-Brasil' : 'gov.br'} registrada (demo).`);
                      });
                    }}
                  />
                  <label>Justificativa (interrupção)</label>
                  <textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
                  <div className="cluster">
                    <button type="button" className="btn btn-ok" onClick={() => void concluir()}>
                      Concluir vistoria
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => void interromper()}>
                      Interromper OS
                    </button>
                  </div>
                </div>
              </details>

              {msg && <p className={msgIsError ? 'text-warn' : 'text-ok'}>{msg}</p>}
            </SectionCard>
          </div>
        )}
      </div>

      {selected && (
        <div className="campo-mobile-bar" aria-label="Ações rápidas">
          <button type="button" className="btn btn-sm btn-block" onClick={() => void checkIn()}>
            {vistoria?.checkInAt ? 'Atualizar GPS' : 'Check-in GPS'}
          </button>
          <button type="button" className="btn btn-sm btn-ok btn-block" onClick={() => void concluir()}>
            Concluir
          </button>
        </div>
      )}
    </>
  );
}
