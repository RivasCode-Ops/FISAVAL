import { useEffect, useRef, useState } from 'react';

type Props = {
  nomeFiscal: string;
  onSave: (blob: Blob) => void;
  initialUrl?: string | null;
};

export function AssinaturaPad({ nomeFiscal, onSave, initialUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [saved, setSaved] = useState(!!initialUrl);
  const [preview, setPreview] = useState(initialUrl ?? null);

  useEffect(() => {
    setPreview(initialUrl ?? null);
    setSaved(!!initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setDrawing(true);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    setDrawing(false);
  }

  function limpar() {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    setSaved(false);
    setPreview(null);
  }

  async function salvar() {
    const c = canvasRef.current;
    if (!c) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob || blob.size < 80) {
      alert('Desenhe sua assinatura antes de salvar.');
      return;
    }
    onSave(blob);
    setPreview(URL.createObjectURL(blob));
    setSaved(true);
  }

  return (
    <div className="assinatura-pad">
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 0.5rem' }}>
        Assinatura de <strong>{nomeFiscal}</strong> (obrigatória para concluir)
      </p>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="assinatura-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      {preview && (
        <img src={preview} alt="Assinatura salva" className="assinatura-preview" />
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm btn-outline" onClick={limpar}>
          Limpar
        </button>
        <button type="button" className="btn btn-sm" onClick={() => void salvar()}>
          {saved ? 'Atualizar assinatura' : 'Salvar assinatura'}
        </button>
      </div>
    </div>
  );
}
