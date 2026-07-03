import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  title: string;
  html: string;
  onClose: () => void;
};

export function PrintPreviewModal({ open, title, html, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function imprimir() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  return (
    <div className="print-preview-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="print-preview-panel">
        <header className="print-preview-toolbar">
          <strong>{title}</strong>
          <div className="print-preview-actions">
            <button type="button" className="btn btn-sm" onClick={imprimir}>
              Imprimir / Salvar PDF
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>
        <iframe
          ref={iframeRef}
          title={title}
          className="print-preview-frame"
          srcDoc={html}
          sandbox="allow-same-origin allow-modals"
        />
      </div>
    </div>
  );
}
