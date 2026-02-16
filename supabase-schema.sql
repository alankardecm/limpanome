-- =============================================
-- CRM LIMPA NOME - Schema PostgreSQL para Supabase
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- Tabela principal de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  email TEXT,
  telefone TEXT NOT NULL,
  telefone2 TEXT,
  data_nascimento DATE,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  profissao TEXT,
  renda_mensal NUMERIC(12,2),
  estado_civil TEXT,
  servico_contratado TEXT,
  origem TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'lead',
  score_inicial INTEGER,
  score_atual INTEGER,
  observacoes TEXT,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de dívidas do cliente
CREATE TABLE IF NOT EXISTS dividas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  credor TEXT NOT NULL,
  valor_original NUMERIC(12,2),
  valor_atualizado NUMERIC(12,2),
  tipo TEXT,
  bureau TEXT,
  data_vencimento DATE,
  contrato TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'ativa',
  data_cadastro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de processos/liminares
CREATE TABLE IF NOT EXISTS processos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_processo TEXT,
  tipo TEXT DEFAULT 'liminar',
  advogado TEXT,
  escritorio TEXT,
  plataforma TEXT,
  vara TEXT,
  comarca TEXT,
  status TEXT DEFAULT 'em_andamento',
  bureaus_alvo JSONB DEFAULT '[]',
  data_ajuizamento DATE,
  data_liminar DATE,
  data_cumprimento DATE,
  data_validade DATE,
  valor_honorarios NUMERIC(12,2),
  valor_custas NUMERIC(12,2),
  observacoes TEXT,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de apontamentos BACEN
CREATE TABLE IF NOT EXISTS apontamentos_bacen (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT,
  instituicao TEXT,
  valor NUMERIC(12,2),
  data_ocorrencia DATE,
  data_consulta TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ativo',
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  observacoes TEXT,
  data_cadastro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico/timeline do cliente
CREATE TABLE IF NOT EXISTS historico (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  usuario TEXT,
  dados_extra JSONB,
  data_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de score tracking
CREATE TABLE IF NOT EXISTS score_historico (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  bureau TEXT,
  data_consulta TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tarefas/follow-ups
CREATE TABLE IF NOT EXISTS tarefas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'geral',
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  data_vencimento DATE,
  responsavel TEXT,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  data_conclusao TIMESTAMPTZ
);

-- Tabela de documentos/PDFs
CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'geral',
  descricao TEXT,
  nome_arquivo TEXT NOT NULL,
  caminho_storage TEXT NOT NULL,
  url TEXT,
  tamanho INTEGER,
  mimetype TEXT,
  data_upload TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_origem ON clientes(origem);
CREATE INDEX IF NOT EXISTS idx_dividas_cliente ON dividas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_processos_cliente ON processos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_processos_status ON processos(status);
CREATE INDEX IF NOT EXISTS idx_bacen_cliente ON apontamentos_bacen(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_cliente ON historico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento ON tarefas(data_vencimento);

-- =============================================
-- VIEW: Clientes com totais de dívidas e processos
-- =============================================
CREATE OR REPLACE VIEW clientes_view AS
SELECT
  c.*,
  COALESCE(d.total_dividas, 0)::int AS total_dividas,
  COALESCE(d.valor_total_dividas, 0) AS valor_total_dividas,
  COALESCE(p.total_processos, 0)::int AS total_processos
FROM clientes c
LEFT JOIN (
  SELECT cliente_id,
    COUNT(*)::int AS total_dividas,
    COALESCE(SUM(valor_original), 0) AS valor_total_dividas
  FROM dividas GROUP BY cliente_id
) d ON d.cliente_id = c.id
LEFT JOIN (
  SELECT cliente_id, COUNT(*)::int AS total_processos
  FROM processos GROUP BY cliente_id
) p ON p.cliente_id = c.id;

-- =============================================
-- FUNCTION: Dashboard stats (single RPC call)
-- =============================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'clientes_por_status',
      COALESCE((SELECT json_agg(json_build_object('status', sub.status, 'total', sub.cnt))
        FROM (SELECT status, COUNT(*)::int AS cnt FROM clientes GROUP BY status) sub), '[]'::json),

    'total_clientes', (SELECT COUNT(*)::int FROM clientes),

    'clientes_por_origem',
      COALESCE((SELECT json_agg(json_build_object('origem', sub.origem, 'total', sub.cnt))
        FROM (SELECT origem, COUNT(*)::int AS cnt FROM clientes GROUP BY origem) sub), '[]'::json),

    'processos_por_status',
      COALESCE((SELECT json_agg(json_build_object('status', sub.status, 'total', sub.cnt))
        FROM (SELECT status, COUNT(*)::int AS cnt FROM processos GROUP BY status) sub), '[]'::json),

    'total_processos', (SELECT COUNT(*)::int FROM processos),

    'liminares_deferidas', (SELECT COUNT(*)::int FROM processos WHERE status IN ('deferido', 'cumprido')),

    'dividas', json_build_object(
      'total', (SELECT COUNT(*)::int FROM dividas),
      'valor_total', COALESCE((SELECT SUM(valor_original) FROM dividas), 0),
      'valor_medio', COALESCE((SELECT AVG(valor_original) FROM dividas), 0)
    ),

    'dividas_por_bureau',
      COALESCE((SELECT json_agg(json_build_object('bureau', sub.bureau, 'total', sub.cnt, 'valor', sub.val))
        FROM (SELECT bureau, COUNT(*)::int AS cnt, COALESCE(SUM(valor_original), 0) AS val
          FROM dividas WHERE bureau IS NOT NULL GROUP BY bureau) sub), '[]'::json),

    'score_medio', COALESCE((SELECT AVG(score_atual) FROM clientes WHERE score_atual IS NOT NULL), 0),

    'bacen_ativos', (SELECT COUNT(*)::int FROM apontamentos_bacen WHERE status = 'ativo'),
    'bacen_removidos', (SELECT COUNT(*)::int FROM apontamentos_bacen WHERE status = 'removido'),

    'tarefas_pendentes', (SELECT COUNT(*)::int FROM tarefas WHERE status IN ('pendente', 'em_andamento')),
    'tarefas_urgentes', (SELECT COUNT(*)::int FROM tarefas WHERE status IN ('pendente', 'em_andamento') AND prioridade = 'urgente'),
    'tarefas_vencidas', (SELECT COUNT(*)::int FROM tarefas WHERE status IN ('pendente', 'em_andamento') AND data_vencimento < NOW()),

    'novos_7dias', (SELECT COUNT(*)::int FROM clientes WHERE data_cadastro >= NOW() - INTERVAL '7 days'),
    'novos_30dias', (SELECT COUNT(*)::int FROM clientes WHERE data_cadastro >= NOW() - INTERVAL '30 days'),

    'ultimos_clientes',
      COALESCE((SELECT json_agg(row_to_json(sub))
        FROM (SELECT id, nome, cpf, telefone, status, origem, data_cadastro
          FROM clientes ORDER BY data_cadastro DESC LIMIT 10) sub), '[]'::json),

    'ultimas_atividades',
      COALESCE((SELECT json_agg(row_to_json(sub))
        FROM (SELECT h.id, h.cliente_id, h.tipo, h.descricao, h.usuario, h.data_registro, c.nome AS cliente_nome
          FROM historico h JOIN clientes c ON h.cliente_id = c.id
          ORDER BY h.data_registro DESC LIMIT 15) sub), '[]'::json),

    'liminares_expirando',
      COALESCE((SELECT json_agg(row_to_json(sub))
        FROM (SELECT p.id, p.cliente_id, p.numero_processo, p.status, p.data_validade, c.nome AS cliente_nome
          FROM processos p JOIN clientes c ON p.cliente_id = c.id
          WHERE p.data_validade IS NOT NULL
            AND p.data_validade <= (NOW() + INTERVAL '30 days')::date
            AND p.status IN ('deferido', 'cumprido')
          ORDER BY p.data_validade ASC LIMIT 10) sub), '[]'::json)

  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================
-- Tabela de preços dos serviços
-- =============================================
CREATE TABLE IF NOT EXISTS tabela_precos (
  id SERIAL PRIMARY KEY,
  servico TEXT NOT NULL UNIQUE,
  preco_tabela NUMERIC(12,2),
  preco_meekah NUMERIC(12,2),
  preco_geral NUMERIC(12,2),
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: dados iniciais da tabela de preços
INSERT INTO tabela_precos (servico, preco_tabela, preco_meekah, preco_geral, ordem) VALUES
  ('Limpa Nome',             270.00,  600.00,  600.00,  1),
  ('Rating',                 600.00,  990.00,  1200.00, 2),
  ('Score',                  345.00,  NULL,    700.00,  3),
  ('Bacen',                  2400.00, 3400.00, 3600.00, 4),
  ('Remoção de Processos',   225.00,  NULL,    NULL,    5),
  ('CNH',                    420.00,  NULL,    NULL,    6),
  ('Multas',                 420.00,  NULL,    NULL,    7),
  ('Reclame Aqui',           500.00,  NULL,    NULL,    8),
  ('Limpa Nome + Score',     NULL,    NULL,    1300.00, 9),
  ('Diagnóstico Financeiro', 13.00,   50.00,   50.00,   10)
ON CONFLICT (servico) DO NOTHING;

-- =============================================
-- PERMISSÕES (necessário para acesso via anon key)
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO anon, authenticated;
