CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fiscal', 'gestor', 'admin')),
  senha TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demandas (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  bairro TEXT NOT NULL,
  prioridade TEXT NOT NULL,
  prazo TEXT NOT NULL,
  status TEXT NOT NULL,
  inscricao TEXT,
  endereco TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(POINT, 4326),
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordens (
  id TEXT PRIMARY KEY,
  demanda_id TEXT NOT NULL REFERENCES demandas(id),
  fiscal_id TEXT NOT NULL REFERENCES users(id),
  fiscal_nome TEXT NOT NULL,
  inscricao TEXT NOT NULL,
  endereco TEXT NOT NULL,
  bairro TEXT NOT NULL,
  prioridade TEXT,
  prazo TEXT,
  status TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  rota_ordem INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vistorias (
  id TEXT PRIMARY KEY,
  os_id TEXT NOT NULL REFERENCES ordens(id),
  checklist JSONB NOT NULL DEFAULT '{}',
  divergencia BOOLEAN NOT NULL DEFAULT FALSE,
  justificativa TEXT,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_in_at TIMESTAMPTZ,
  concluida_at TIMESTAMPTZ,
  assinatura_at TIMESTAMPTZ,
  assinatura_nome TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vistoria_fotos (
  id TEXT PRIMARY KEY,
  vistoria_id TEXT NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ordens_fiscal ON ordens(fiscal_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_os ON vistorias(os_id);
CREATE INDEX IF NOT EXISTS idx_fotos_vistoria ON vistoria_fotos(vistoria_id);
