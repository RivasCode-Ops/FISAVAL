import { useCallback, useEffect, useState } from 'react';
import type { AssinaturaModo, OrdemServico, Vistoria } from '@/types';
import { AssinaturaPanel } from '@/components/AssinaturaPanel';
import { RotaMap } from '@/components/RotaMap';
import { mapsDirUrl } from '@/lib/rota';
import { useAuthStore } from '@/store/authStore';
import type { VistoriaFoto } from '@/types';
import {
  CHECKLIST_ITEMS,
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
import { distanciaMetros, filtrarOsAtivas, prazoVencido } from '@/lib/rota';
import { getApiUrl, isApiMode } from '@/api/config';
import { getStoredTenantId } from '@/api/tenantStorage';
import { useNovasOsAlert } from '@/hooks/useNovasOsAlert';
import { subscribeWebPush } from '@/lib/push';

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

  async function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vistoria) return;
    const foto = await uploadFoto(vistoria.id, file);
    if (foto) {
      setFotos((prev) => [...prev, foto]);
      const url = await getFotoDisplayUrl(foto.id);
      if (url) setFotoUrls((prev) => ({ ...prev, [foto.id]: url }));
      setMsg(navigator.onLine && isApiMode() ? 'Foto enviada.' : 'Foto salva no aparelho (sincronize depois).');
    }
    e.target.value = '';
  }

  async function checkIn() {
    if (!selected || !vistoria) return;
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000 });
    });
    await updateOsStatus(selected.id, 'check_in');
    await saveVistoria(vistoria.id, {
      checkInAt: new Date().toISOString(),
      checkInLat: pos?.coords.latitude ?? selected.lat,
      checkInLng: pos?.coords.longitude ?? selected.lng,
    });
    await updateOsStatus(selected.id, 'em_vistoria');
    setMsg('Check-in registrado.');
    await reload();
    const v = await getOrCreateVistoria(selected.id);
    setVistoria(v);
  }

  async function toggleCheck(id: string, checked: boolean) {
    if (!vistoria) return;
    const checklist = { ...vistoria.checklist, [id]: checked };
    const divergencia = !!checklist.divergencia;
    await saveVistoria(vistoria.id, { checklist, divergencia });
    setVistoria({ ...vistoria, checklist, divergencia });
  }

  async function concluir() {
    if (!selected || !vistoria) return;
    if (!(await hasAssinatura(vistoria.id))) {
      setMsg('Salve a assinatura antes de concluir a vistoria.');
      return;
    }
    await concluirVistoria(vistoria.id, selected.id);
    setMsg('Vistoria concluída — pendente de sincronização.');
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
    setMsg(n ? `${n} item(ns) sincronizado(s) com o servidor.` : 'Nada pendente.');
    await reload();
  }

  async function otimizarRota() {
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000 });
    });
    const start = pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined;
    const r = await otimizarRotaFiscal(session.userId, start);
    if (r.capacidadeRestante === 0) {
      setRotaResumo(null);
      setMsg('Capacidade diária de visitas esgotada.');
    } else if (r.paradas) {
      const motor =
        r.engine === 'vroom' ? 'VROOM' : r.engine === 'prazo-proximidade' ? 'prazo+GPS' : r.engine;
      const seq = r.tiposRota?.length ? ` · ${r.tiposRota.join(' → ')}` : '';
      setRotaResumo(`~${r.distanciaKm} km · ~${r.duracaoMinEst} min (${motor})${seq}`);
      setMsg(`Rota otimizada: ${r.paradas} parada(s).`);
    } else {
      setRotaResumo(null);
      setMsg('Nenhuma OS ativa para ordenar.');
    }
    await reload();
  }

  const rotaAtiva = filtrarOsAtivas(ordens);

  return (
    <div className="grid2">
      <div className="card">
        <h2>Minhas OS ({ordens.length})</h2>
        <RotaMap ordens={rotaAtiva} selectedId={selected?.id} onSelect={setSelected} />
        <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: '0.5rem' }} onClick={() => void otimizarRota()}>
          Otimizar rota (GPS)
        </button>
        {rotaResumo && (
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.5rem' }}>{rotaResumo}</p>
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
              {o.prazo && (
                <span className={`badge ${prazoVencido(o.prazo) ? 'b-pri-alta' : 'b-status'}`}>
                  {o.prazo.slice(0, 10)}
                </span>
              )}{' '}
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
        <button type="button" className="btn" style={{ marginTop: '0.75rem', width: '100%' }} onClick={() => void sync()}>
          Sincronizar pendentes
        </button>
        {isApiMode() && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: '0.5rem', width: '100%' }}
            onClick={() => {
              void subscribeWebPush().then((r) => {
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
        {pushMsg && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.35rem' }}>{pushMsg}</p>}
      </div>

      {selected && (
        <div className="card">
          <h2>{selected.id}</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{selected.endereco}</p>
          <a
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-block', marginBottom: '0.5rem' }}
            href={mapsDirUrl(selected.lat, selected.lng)}
            target="_blank"
            rel="noreferrer"
          >
            Abrir no mapa (navegação)
          </a>
          <button type="button" className="btn" style={{ width: '100%', marginBottom: '0.5rem' }} onClick={() => void checkIn()}>
            Check-in GPS
          </button>
          <div className="checklist">
            {CHECKLIST_ITEMS.map((c) => (
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
          <label>Fotos da vistoria</label>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => void onFotoChange(e)} />
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
          <AssinaturaPanel
            nomeFiscal={session.nome}
            modos={assinaturaModos}
            padrao={assinaturaPadrao}
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
                setMsg('Assinatura salva.');
              });
            }}
            onSaveCertificada={(modo) => {
              void registrarAssinaturaCertificada(vistoria!.id, session.nome, modo).then((v) => {
                if (v) setVistoria(v);
                setAssinaturaUrl(null);
                setMsg(`Assinatura ${modo === 'icp' ? 'ICP-Brasil' : 'gov.br'} registrada (demo).`);
              });
            }}
          />
          <label>Justificativa (interrupção)</label>
          <textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ok" onClick={() => void concluir()}>
              Concluir vistoria
            </button>
            <button type="button" className="btn btn-outline" onClick={() => void interromper()}>
              Interromper OS
            </button>
          </div>
          {msg && <p style={{ color: 'var(--ok)', marginTop: '0.75rem' }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}
