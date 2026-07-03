ALTER TABLE demandas ADD COLUMN IF NOT EXISTS prazo_vistoria_em TEXT;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS data_inicio_execucao_em TIMESTAMPTZ;
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS prazo_campo_em TEXT;

UPDATE demandas SET prazo_vistoria_em = prazo WHERE prazo_vistoria_em IS NULL;
UPDATE ordens SET prazo_campo_em = prazo WHERE prazo_campo_em IS NULL;
