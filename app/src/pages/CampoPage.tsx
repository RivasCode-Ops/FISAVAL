import { useCallback, useEffect, useState } from 'react';
import type { OrdemServico, Vistoria } from '@/types';
import { RotaMap } from '@/components/RotaMap';
import { mapsDirUrl } from '@/lib/rota';
import { useAuthStore } from '@/store/authStore';
import type { VistoriaFoto } from '@/types';
import {
  CHECKLIST_ITEMS,
  concluirVistoria,
  getFotoDisplayUrl,
  getOrCreateVistoria,
  listFotos,
  listOrdensFiscal,
  otimizarRotaFiscal,
  saveVistoria,
  syncPendentes,
  updateOsStatus,
  uploadFoto,
} from '@/services/fisavalService';
import { filtrarOsAtivas } from '@/lib/rota';
import { isApiMode } from '@/api/config';
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

  useNovasOsAlert(ordens.length, true);

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
    const n = await otimizarRotaFiscal(session.userId, start);
    setMsg(n ? `Rota otimizada (${n} paradas).` : 'Nenhuma OS ativa para ordenar.');
    await reload();
  }

  const rotaAtiva = filtrarOsAtivas(ordens);

  return (
    <div className="grid2">
      <div className="card">
        <h2>Minhas OS ({ordens.length})</h2>
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
