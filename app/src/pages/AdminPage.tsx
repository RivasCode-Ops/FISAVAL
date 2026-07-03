import { useCallback, useEffect, useState } from 'react';
import type { AssinaturaModo } from '@/types';
import { getApiUrl, isApiMode } from '@/api/config';
import { getStoredTenantId } from '@/api/tenantStorage';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { labelTiposHabilitados, TIPOS_VISTORIA } from '@/lib/tipoVistoria';
import { importDemandasCsvFile, listFiscais, updateFiscalTipos } from '@/services/fisavalService';
import type { User } from '@/types';

type TenantConfig = {
  municipio?: string;
  tenantId?: string;
  checkinRadiusM?: number;
  assinaturaModos?: AssinaturaModo[];
  assinaturaPadrao?: AssinaturaModo;
  smtpEnabled?: boolean;
};

export function AdminPage() {
  const [fiscais, setFiscais] = useState<Omit<User, 'senha'>[]>([]);
  const [habilitacoesMsg, setHabilitacoesMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [configErro, setConfigErro] = useState('');

  const reload = useCallback(async () => {
    setFiscais(await listFiscais());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const base = getApiUrl();
    if (!base) {
      setConfigErro('Configuração detalhada disponível com API ativa.');
      return;
    }
    const tid = getStoredTenantId();
    void fetch(`${base}/api/fisaval/config`, { headers: tid ? { 'X-Tenant-Id': tid } : {} })
      .then((r) => r.json())
      .then((c: TenantConfig) => {
        setConfig(c);
        setConfigErro('');
      })
      .catch(() => setConfigErro('Não foi possível carregar a configuração.'));
  }, []);

  return (
    <>
      <PageHeader
        title="Administração"
        description="Configuração do tenant e equipe de campo."
      />

      <SectionCard title="Configuração do tenant" subtitle="Parâmetros ativos no servidor (somente leitura).">
        {configErro && <p className="muted">{configErro}</p>}
        {config && (
          <dl className="info-panel">
            <div>
              <dt>Município</dt>
              <dd>{config.municipio ?? '—'}</dd>
            </div>
            <div>
              <dt>Tenant</dt>
              <dd>{config.tenantId ?? '—'}</dd>
            </div>
            <div>
              <dt>Raio check-in GPS</dt>
              <dd>{config.checkinRadiusM != null ? `${config.checkinRadiusM} m` : '—'}</dd>
            </div>
            <div>
              <dt>Modos de assinatura</dt>
              <dd>{config.assinaturaModos?.join(', ') ?? '—'}</dd>
            </div>
            <div>
              <dt>Assinatura padrão</dt>
              <dd>{config.assinaturaPadrao ?? '—'}</dd>
            </div>
            <div>
              <dt>E-mail automático (SMTP)</dt>
              <dd>{config.smtpEnabled ? 'Ativo' : 'Inativo'}</dd>
            </div>
          </dl>
        )}
        {!isApiMode() && (
          <p className="muted">Modo local: parâmetros vêm do seed e variáveis de ambiente da API.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Habilitações por fiscal"
        subtitle="Tipos de vistoria por agente de campo (skills VROOM). Vazio = todos."
      >
        {fiscais.length === 0 ? (
          <p className="muted">Nenhum agente de campo cadastrado.</p>
        ) : (
          fiscais.map((f) => (
            <div key={f.id} className="stack stack--sm">
              <strong>
                {f.nome}{' '}
                <span className="muted">({labelTiposHabilitados(f.tiposHabilitados)})</span>
              </strong>
              <div className="cluster">
                {TIPOS_VISTORIA.map((tipo) => {
                  const todos = !f.tiposHabilitados?.length;
                  const checked = todos || f.tiposHabilitados!.includes(tipo);
                  return (
                    <label key={tipo} className="checklist">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const base = f.tiposHabilitados?.length
                            ? [...f.tiposHabilitados!]
                            : [...TIPOS_VISTORIA];
                          const next = e.target.checked
                            ? [...new Set([...base, tipo])]
                            : base.filter((t) => t !== tipo);
                          void updateFiscalTipos(f.id, next).then(() => {
                            setHabilitacoesMsg(
                              `${f.nome}: ${labelTiposHabilitados(next.length ? next : undefined)}`,
                            );
                            void reload();
                          });
                        }}
                      />
                      {tipo}
                    </label>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    void updateFiscalTipos(f.id, []).then(() => {
                      setHabilitacoesMsg(`${f.nome}: todos os tipos`);
                      void reload();
                    });
                  }}
                >
                  Todos
                </button>
              </div>
            </div>
          ))
        )}
        {habilitacoesMsg && <p className="text-ok">{habilitacoesMsg}</p>}
      </SectionCard>

      <SectionCard title="Importar cadastro (CSV)">
        <p className="muted">
          Colunas: <code>bairro</code> (obrig.), <code>inscricao</code>, <code>endereco</code>, <code>tipo</code>,{' '}
          <code>prioridade</code>, <code>prazo</code>, <code>lat</code>, <code>lng</code> — separador ; ou ,
        </p>
        <p>
          Modelo:{' '}
          <a href="https://github.com/RivasCode-Ops/FISAVAL/blob/main/docs/samples/import-demandas.csv">
            import-demandas.csv
          </a>
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void importDemandasCsvFile(file).then((r) => {
              setImportMsg(
                `${r.created} demanda(s) importada(s).${r.errors.length ? ` Avisos: ${r.errors.join('; ')}` : ''}`,
              );
            });
            e.target.value = '';
          }}
        />
        {importMsg && <p className="text-ok">{importMsg}</p>}
      </SectionCard>
    </>
  );
}
