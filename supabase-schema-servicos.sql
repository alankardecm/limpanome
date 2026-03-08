-- ============================================================
-- TABELA: servicos_cliente
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS servicos_cliente (
  id              SERIAL PRIMARY KEY,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  -- Tipos: limpa_nome_cpf | limpa_nome_cnpj | rating_cpf | rating_cnpj | score | bacen
  descricao       TEXT,
  status          TEXT NOT NULL DEFAULT 'em_andamento',
  -- Status: em_andamento | concluido | cancelado
  data_inicio     DATE DEFAULT CURRENT_DATE,
  data_conclusao  DATE,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE servicos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on servicos_cliente" ON servicos_cliente;
CREATE POLICY "Allow all on servicos_cliente" ON servicos_cliente
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON servicos_cliente TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE servicos_cliente_id_seq TO anon, authenticated;
