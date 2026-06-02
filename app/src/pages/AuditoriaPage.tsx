import { useEffect, useState } from 'react';
import { isApiMode } from '@/api/config';
import { getApiUrl } from '@/api/config';
import { useAuthStore } from '@/store/authStore';

type AuditEntry = {
  id: string;
  at: string;
  userNome: string;
  userEmail: string;
  role: string;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
};

export function AuditoriaPage() {
  const [lista, setLista] = useState<AuditEntry[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    void (async () => {
      if (!isApiMode()) {
        setErro('Auditoria disponível apenas com API (modo servidor).');
        return;
      }
      const base = getApiUrl();
      const token = useAuthStore.getState().token;
      if (!base || !token) {
        setErro('Faça login com API ativa.');
        return;
      }
      try {
        const res = await fetch(`${base}/api/fisaval/audit?limit=300`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Falha ao carregar');
        setLista((await res.json()) as AuditEntry[]);
      } catch {
        setErro('Não foi possível carregar o log.');
      }
    })();
  }, []);

  return (
    <div className="card">
      <h2>Auditoria do sistema</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        Registro de logins, demandas, OS, homologações e importações (últimos eventos no servidor).
      </p>
      {erro && <p style={{ color: 'var(--warn)' }}>{erro}</p>}
      {!erro && (
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.at).toLocaleString('pt-BR')}</td>
                <td>
                  {a.userNome}
                  <br />
                  <small style={{ color: 'var(--muted)' }}>{a.role}</small>
                </td>
                <td>
                  <code>{a.action}</code>
                  {a.entityId && (
                    <>
                      <br />
                      <small>{a.entityId}</small>
                    </>
                  )}
                </td>
                <td>{a.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
