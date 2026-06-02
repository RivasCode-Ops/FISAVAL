import { useState } from 'react';
import type { AssinaturaModo } from '@/types';
import { AssinaturaPad } from '@/components/AssinaturaPad';

const MODO_LABEL: Record<AssinaturaModo, string> = {
  canvas: 'Desenho (campo)',
  icp: 'ICP-Brasil',
  govbr: 'gov.br',
};

type Props = {
  nomeFiscal: string;
  modos: AssinaturaModo[];
  padrao: AssinaturaModo;
  initialUrl?: string | null;
  certificadaRef?: string | null;
  certificadaModo?: AssinaturaModo;
  onSaveCanvas: (blob: Blob) => void;
  onSaveCertificada: (modo: 'icp' | 'govbr') => void;
};

export function AssinaturaPanel({
  nomeFiscal,
  modos,
  padrao,
  initialUrl,
  certificadaRef,
  certificadaModo,
  onSaveCanvas,
  onSaveCertificada,
}: Props) {
  const initial = modos.includes(certificadaModo ?? 'canvas')
    ? (certificadaModo ?? padrao)
    : padrao;
  const [modo, setModo] = useState<AssinaturaModo>(initial);

  return (
    <div className="assinatura-panel">
      {modos.length > 1 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {modos.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn btn-sm ${modo === m ? '' : 'btn-outline'}`}
              onClick={() => setModo(m)}
            >
              {MODO_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      {modo === 'canvas' && (
        <AssinaturaPad nomeFiscal={nomeFiscal} initialUrl={initialUrl} onSave={onSaveCanvas} />
      )}

      {modo === 'icp' && (
        <div className="assinatura-certificada">
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Integração ICP-Brasil (demo): em produção, abra o provedor de certificado digital e retorne o token de
            assinatura.
          </p>
          {certificadaModo === 'icp' && certificadaRef && (
            <p style={{ fontSize: '0.8rem' }}>
              Registrada: <code>{certificadaRef}</code>
            </p>
          )}
          <button type="button" className="btn btn-sm" onClick={() => onSaveCertificada('icp')}>
            Simular assinatura ICP-Brasil
          </button>
        </div>
      )}

      {modo === 'govbr' && (
        <div className="assinatura-certificada">
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Integração gov.br Sign (demo): em produção, redirecione ao fluxo OAuth do assinador gov.br.
          </p>
          {certificadaModo === 'govbr' && certificadaRef && (
            <p style={{ fontSize: '0.8rem' }}>
              Registrada: <code>{certificadaRef}</code>
            </p>
          )}
          <button type="button" className="btn btn-sm" onClick={() => onSaveCertificada('govbr')}>
            Simular assinatura gov.br
          </button>
        </div>
      )}
    </div>
  );
}
