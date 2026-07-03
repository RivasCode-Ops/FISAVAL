import { getActiveTenantId } from './tenantContext.js';
import { municipioForTenant } from './tenantRegistry.js';
import type { DbShape } from './types.js';

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}`;

function emptyDb(): DbShape {
  return { users: [], demandas: [], ordens: [], vistorias: [], fotos: [] };
}

/** Seed completo do tenant demo (padrão histórico). */
function seedDemo(): DbShape {
  const t = now();
  const db = emptyDb();
  db.users = [
    { id: 'u-gestor', email: 'gestor@demo', nome: 'Gestor Finanças', role: 'gestor', senha: 'demo123' },
    { id: 'u-fiscal1', email: 'fiscal@demo', nome: 'Ana Silva', role: 'fiscal', senha: 'demo123' },
    {
      id: 'u-fiscal2',
      email: 'carlos@demo',
      nome: 'Carlos Mendes',
      role: 'fiscal',
      senha: 'demo123',
      tiposHabilitados: ['Denúncia'],
    },
    { id: 'u-admin', email: 'admin@demo', nome: 'Administrador', role: 'admin', senha: 'demo123' },
  ];
  db.demandas = [
    {
      id: 'D-1042',
      tipo: 'IPTU / avaliação cadastral',
      finalidade: 'IPTU',
      dadosReferencia: {
        inscricaoRef: '12.034.0056.0001',
        areaCadastrada: '120',
        usoCadastrado: 'Residencial',
        padraoCadastrado: 'Médio',
      },
      bairro: 'Centro',
      prioridade: 'alta',
      prazo: '2026-06-05',
      prazoVistoriaEm: '2026-06-05',
      status: 'os_gerada',
      dataInicioExecucaoEm: t,
      inscricao: '12.034.0056.0001',
      endereco: 'R. das Flores, 123',
      lat: -23.5505,
      lng: -46.6333,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: 'D-1043',
      tipo: 'Denúncia',
      finalidade: 'DENUNCIA',
      dadosReferencia: { motivoDenuncia: 'Obra irregular', referenciaDenuncia: 'PROT-2026-089' },
      bairro: 'Vila Nova',
      prioridade: 'alta',
      prazo: '2025-12-01',
      prazoVistoriaEm: '2025-12-01',
      status: 'aberta',
      inscricao: '12.034.0089.0012',
      endereco: 'Av. Brasil, 890',
      lat: -23.552,
      lng: -46.631,
      createdAt: t,
      updatedAt: t,
    },
  ];
  db.ordens = [
    {
      id: 'OS-8821',
      demandaId: 'D-1042',
      fiscalId: 'u-fiscal1',
      fiscalNome: 'Ana Silva',
      inscricao: '12.034.0056.0001',
      endereco: 'R. das Flores, 123',
      bairro: 'Centro',
      tipo: 'IPTU / avaliação cadastral',
      finalidade: 'IPTU',
      dadosReferencia: {
        inscricaoRef: '12.034.0056.0001',
        areaCadastrada: '120',
        usoCadastrado: 'Residencial',
        padraoCadastrado: 'Médio',
      },
      prioridade: 'alta',
      prazo: '2025-10-20',
      prazoCampoEm: '2025-10-20',
      status: 'atribuida',
      lat: -23.5505,
      lng: -46.6333,
      rotaOrdem: 1,
      createdAt: t,
      updatedAt: t,
    },
  ];
  return db;
}

/** Seed Paulínia — segunda prefeitura na demo multi-tenant. */
function seedPaulinia(): DbShape {
  const t = now();
  const db = emptyDb();
  db.users = [
    {
      id: 'u-gestor-pau',
      email: 'gestor@paulinia.sp.gov.br',
      nome: 'Gestor IPTU Paulínia',
      role: 'gestor',
      senha: 'demo123',
    },
    {
      id: 'u-fiscal-pau',
      email: 'fiscal@paulinia.sp.gov.br',
      nome: 'Ricardo Oliveira',
      role: 'fiscal',
      senha: 'demo123',
      tiposHabilitados: ['Recadastramento', 'Revisão cadastral'],
    },
    { id: 'u-admin-pau', email: 'admin@paulinia.sp.gov.br', nome: 'Admin Paulínia', role: 'admin', senha: 'demo123' },
  ];
  db.demandas = [
    {
      id: 'D-PAU-101',
      tenantId: 'paulinia-sp',
      tipo: 'Recadastramento',
      bairro: 'Jardim Paulínia',
      prioridade: 'media',
      prazo: '2026-06-12',
      status: 'aberta',
      inscricao: '45.012.0034.0008',
      endereco: 'R. João Carlos, 450',
      lat: -22.7611,
      lng: -47.1542,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: 'D-PAU-102',
      tenantId: 'paulinia-sp',
      tipo: 'Denúncia',
      bairro: 'Betel',
      prioridade: 'alta',
      prazo: '2025-11-15',
      status: 'aberta',
      inscricao: '45.012.0091.0021',
      endereco: 'Av. José Paulino, 1200',
      lat: -22.758,
      lng: -47.149,
      createdAt: t,
      updatedAt: t,
    },
  ];
  return db;
}

/** Seed mínimo para qualquer tenant novo. */
function seedGenerico(tenantId: string): DbShape {
  const t = now();
  const municipio = municipioForTenant(tenantId);
  const db = emptyDb();
  const slug = tenantId.replace(/[^a-z0-9]/g, '') || 'tenant';
  db.users = [
    {
      id: `u-gestor-${slug}`,
      email: `gestor@${slug}.local`,
      nome: `Gestor ${municipio}`,
      role: 'gestor',
      senha: 'demo123',
    },
    {
      id: `u-fiscal-${slug}`,
      email: `fiscal@${slug}.local`,
      nome: `Fiscal ${municipio}`,
      role: 'fiscal',
      senha: 'demo123',
    },
  ];
  db.demandas = [
    {
      id: uid('D'),
      tenantId,
      tipo: 'Revisão cadastral',
      bairro: 'Centro',
      prioridade: 'media',
      prazo: '2026-07-01',
      status: 'aberta',
      endereco: `Sede — ${municipio}`,
      lat: -23.55,
      lng: -46.63,
      createdAt: t,
      updatedAt: t,
    },
  ];
  return db;
}

export function buildTenantSeed(tenantId?: string): DbShape {
  const id = (tenantId ?? getActiveTenantId()).toLowerCase();
  if (id === 'demo') return seedDemo();
  if (id === 'paulinia-sp') return seedPaulinia();
  return seedGenerico(id);
}
