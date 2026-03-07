-- ============================================================
-- TABELA: fichas_rating
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS fichas_rating (
  id                   SERIAL PRIMARY KEY,
  cliente_id           INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,

  -- Pessoa Física
  titulo_eleitor       TEXT,
  rg                   TEXT,
  data_expedicao       DATE,
  estado_civil         TEXT,

  -- Cônjuge
  conjuge_nome         TEXT,
  conjuge_cpf          TEXT,
  conjuge_rg           TEXT,

  -- Filiação
  nome_pai             TEXT,
  nome_mae             TEXT,

  -- Endereço
  endereco             TEXT,
  numero               TEXT,
  cep                  TEXT,
  bairro               TEXT,
  cidade               TEXT,
  estado               TEXT,

  -- Contato / Trabalho
  telefone_residencial TEXT,
  empresa              TEXT,
  data_admissao        DATE,
  salario              NUMERIC(12,2),
  renda_familiar       NUMERIC(12,2),
  faturamento          NUMERIC(12,2),

  -- Arrays (JSON)
  -- bancos: [{nome_banco, numero_conta, agencia}]
  bancos               JSONB DEFAULT '[]',
  -- referencias: [{nome, celular, grau_relacionamento}]
  referencias          JSONB DEFAULT '[]',
  -- logins: [{nome, login, senha}]
  logins               JSONB DEFAULT '[]',
  -- documentos_checklist: [{nome, entregue, observacao}]
  documentos_checklist JSONB DEFAULT '[]',

  -- Controle
  preenchido_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cliente_id)
);

-- Política de acesso: permitir INSERT sem autenticação (cliente envia o formulário)
-- Execute também no SQL Editor:
ALTER TABLE fichas_rating ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on fichas_rating" ON fichas_rating
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON fichas_rating TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE fichas_rating_id_seq TO anon, authenticated;
