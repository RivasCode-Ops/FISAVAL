/** Dados fictícios — demo E-FISCAL (sem backend) */
window.EFISCAL_MOCK = {
  municipio: "Município Piloto",
  fiscais: [
    { id: "f1", nome: "Ana Silva", osAbertas: 4, online: true },
    { id: "f2", nome: "Carlos Mendes", osAbertas: 6, online: true },
    { id: "f3", nome: "Juliana Costa", osAbertas: 2, online: false },
  ],
  demandas: [
    { id: "D-1042", tipo: "Revisão cadastral", bairro: "Centro", prioridade: "alta", prazo: "05/06/2026", status: "OS gerada" },
    { id: "D-1043", tipo: "Denúncia", bairro: "Vila Nova", prioridade: "alta", prazo: "04/06/2026", status: "Aguardando OS" },
    { id: "D-1044", tipo: "Recadastramento", bairro: "Jardim Sul", prioridade: "media", prazo: "10/06/2026", status: "Em análise" },
    { id: "D-1045", tipo: "Auditoria interna", bairro: "Industrial", prioridade: "baixa", prazo: "15/06/2026", status: "OS gerada" },
  ],
  ordens: [
    { id: "OS-8821", inscricao: "12.034.0056.0001", endereco: "R. das Flores, 123", bairro: "Centro", fiscal: "Ana Silva", distancia: "0,4 km", status: "Em vistoria", lat: -23.5505, lng: -46.6333 },
    { id: "OS-8822", inscricao: "12.034.0089.0012", endereco: "Av. Brasil, 890", bairro: "Vila Nova", fiscal: "Ana Silva", distancia: "1,2 km", status: "Atribuída", lat: -23.552, lng: -46.631 },
    { id: "OS-8823", inscricao: "12.034.0120.0033", endereco: "R. Oito, 45", bairro: "Jardim Sul", fiscal: "Carlos Mendes", distancia: "2,1 km", status: "Check-in", lat: -23.548, lng: -46.638 },
    { id: "OS-8824", inscricao: "12.034.0201.0007", endereco: "R. Industrial, 200", bairro: "Industrial", fiscal: "Carlos Mendes", distancia: "3,0 km", status: "Pendente sync", lat: -23.555, lng: -46.629 },
  ],
  checklist: [
    { id: "uso", label: "Uso conforme cadastro (residencial)" },
    { id: "padrao", label: "Padrão construtivo compatível" },
    { id: "conservacao", label: "Estado de conservação regular" },
    { id: "entorno", label: "Infraestrutura do entorno adequada" },
    { id: "divergencia", label: "Divergência cadastral identificada" },
  ],
  kpis: {
    osHoje: 18,
    concluidas: 11,
    tempoMedio: "42 min",
    divergencias: 7,
    pendentesHomolog: 4,
  },
};
