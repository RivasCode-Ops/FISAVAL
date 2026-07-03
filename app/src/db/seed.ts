import { db } from '@/db/database';
import type { Demanda, OrdemServico, User, Vistoria } from '@/types';

const now = () => new Date().toISOString();

export async function ensureSeed(): Promise<void> {
  const count = await db.users.count();
  if (count > 0) return;

  const users: User[] = [
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

  const demandas: Demanda[] = [
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
      dataInicioExecucaoEm: now(),
      inscricao: '12.034.0056.0001',
      endereco: 'R. das Flores, 123',
      lat: -23.5505,
      lng: -46.6333,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'D-1043',
      tipo: 'Denúncia',
      finalidade: 'DENUNCIA',
      dadosReferencia: {
        motivoDenuncia: 'Obra irregular',
        referenciaDenuncia: 'PROT-2026-089',
      },
      bairro: 'Vila Nova',
      prioridade: 'alta',
      prazo: '2025-12-01',
      prazoVistoriaEm: '2025-12-01',
      status: 'aberta',
      inscricao: '12.034.0089.0012',
      endereco: 'Av. Brasil, 890',
      lat: -23.552,
      lng: -46.631,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'D-1044',
      tipo: 'Recadastramento',
      finalidade: 'RECADASTRAMENTO',
      dadosReferencia: {
        inscricaoRef: '12.034.0120.0033',
        dadosAnteriores: 'Área 95 m² · uso comercial',
      },
      bairro: 'Jardim Sul',
      prioridade: 'media',
      prazo: '2026-06-10',
      status: 'aberta',
      endereco: 'R. Oito, 45',
      lat: -23.548,
      lng: -46.638,
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  const ordens: OrdemServico[] = [
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
      dadosReferencia: demandas[0].dadosReferencia,
      prioridade: 'alta',
      prazo: '2025-10-20',
      prazoCampoEm: '2025-10-20',
      status: 'atribuida',
      lat: -23.5505,
      lng: -46.6333,
      rotaOrdem: 1,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'OS-8823',
      demandaId: 'D-1044',
      fiscalId: 'u-fiscal2',
      fiscalNome: 'Carlos Mendes',
      inscricao: '12.034.0120.0033',
      endereco: 'R. Oito, 45',
      bairro: 'Jardim Sul',
      tipo: 'Recadastramento',
      finalidade: 'RECADASTRAMENTO',
      dadosReferencia: demandas[2].dadosReferencia,
      status: 'homologacao',
      lat: -23.548,
      lng: -46.638,
      rotaOrdem: 1,
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  const vistorias: Vistoria[] = [
    {
      id: 'V-1001',
      osId: 'OS-8823',
      checklist: {
        localizado: true,
        estado_imovel: true,
        conferencia_ref: true,
        recad_dados: true,
      },
      resultadoConferencia: 'divergente',
      observacaoConferencia: 'Área constatada maior que cadastro anterior.',
      divergencia: true,
      checkInAt: now(),
      concluidaAt: now(),
      syncStatus: 'synced',
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  await db.transaction('rw', db.users, db.demandas, db.ordens, db.vistorias, async () => {
    await db.users.bulkAdd(users);
    await db.demandas.bulkAdd(demandas);
    await db.ordens.bulkAdd(ordens);
    await db.vistorias.bulkAdd(vistorias);
  });
}
