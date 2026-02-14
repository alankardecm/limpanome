# CRM Limpa Nome

Sistema CRM completo para gestão de clientes do projeto **Limpa Nome** — liminares judiciais para bloqueio de visibilidade do CPF em bureaus de crédito (Serasa, SPC, Boa Vista, BACEN), controle de score e dívidas.

> **Produção:** Hospedado na **Vercel** (serverless) com banco de dados **Supabase** (PostgreSQL).

---

## Índice

- [Visão Geral](#visão-geral)
- [Infraestrutura & Hospedagem](#infraestrutura--hospedagem)
- [Funcionalidades](#funcionalidades)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Banco de Dados (Supabase)](#banco-de-dados-supabase)
- [API Endpoints](#api-endpoints)
- [Webhooks & Integrações](#webhooks--integrações)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Deploy na Vercel](#deploy-na-vercel)
- [Configuração do Supabase](#configuração-do-supabase)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Guia de Integrações](#guia-de-integrações)

---

## Visão Geral

O CRM Limpa Nome é um sistema web completo para gerenciar o fluxo de clientes que contratam o serviço de **limpeza de nome** através de liminares judiciais. O sistema:

1. **Capta leads** via Google Forms, WhatsApp e webhooks genéricos
2. **Gerencia o pipeline** do cliente: Lead → Análise → Em Processo → Concluído
3. **Controla dívidas** registradas em Serasa, SPC, Boa Vista e BACEN
4. **Acompanha processos judiciais** (liminares, tutelas, etc.)
5. **Monitora apontamentos BACEN** (CCF, PEFIN, REFIN)
6. **Rastreia score** de crédito e evolução
7. **Gerencia tarefas** e follow-ups com prioridades e prazos

---

## Infraestrutura & Hospedagem

| Serviço | Plataforma | Conta |
|---------|-----------|-------|
| **Aplicação (API + Frontend)** | [Vercel](https://vercel.com) | Vinculada ao GitHub `alankardecm/limpanome` |
| **Banco de Dados (PostgreSQL)** | [Supabase](https://supabase.com) | `alan.moreira@amconsultoria.site` |
| **Repositório Git** | [GitHub](https://github.com/alankardecm/limpanome) | `alankardecm` |

### URLs

| Ambiente | URL |
|----------|-----|
| Produção (Frontend) | `https://limpanome.vercel.app` (ou domínio customizado configurado na Vercel) |
| API Health Check | `https://limpanome.vercel.app/api/health` |
| Supabase Dashboard | `https://supabase.com/dashboard` (login: `alan.moreira@amconsultoria.site`) |

### Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (SPA Vanilla) — sem frameworks |
| **Backend** | Node.js 18+ com Express 4.21 (Serverless Functions na Vercel) |
| **Banco de Dados** | PostgreSQL 15 (Supabase) |
| **ORM/Client** | @supabase/supabase-js v2 |
| **Ícones** | Font Awesome 6 (CDN) |
| **Hosting** | Vercel (serverless + CDN estático) |

---

## Funcionalidades

### Dashboard
- Métricas em tempo real: total de clientes, processos ativos, score médio, valor total de dívidas
- Pipeline visual de status dos clientes (contagem por etapa)
- Distribuição de dívidas por bureau (Serasa, SPC, Boa Vista, BACEN)
- Alertas: liminares expirando em 30 dias, tarefas vencidas
- Últimas atividades / timeline
- Função RPC `get_dashboard_stats()` que retorna todas as métricas em uma única chamada

### Gestão de Clientes
- Cadastro completo (dados pessoais, contato, endereço, profissão, renda)
- Busca por nome, CPF, telefone ou e-mail
- Filtros por status (`lead`, `analise`, `em_processo`, `concluido`, `cancelado`) e origem
- Detalhe completo com dados de: Dívidas, Processos, BACEN, Histórico
- Pipeline visual (Kanban): Lead → Análise → Em Processo → Concluído → Cancelado
- View `clientes_view` com contagem agregada de dívidas e processos
- Detecção de CPF duplicado no cadastro

### Controle de Dívidas
- Cadastro por credor, bureau, tipo, valor original/atualizado, data de vencimento
- Status: `ativa`, `liminar_ativa`, `baixada`, `negociando`
- Tipos: `cartao_credito`, `emprestimo`, `financiamento`, `servicos`, `impostos`, `outros`
- Totais automáticos por cliente
- Transição automática para "limpa" quando liminar é cumprida

### Processos / Liminares
- Cadastro completo: nº processo, tipo, vara, comarca, advogado
- Bureaus alvo selecionáveis via JSONB (Serasa, SPC, Boa Vista, BACEN)
- Status: `em_andamento`, `deferido`, `indeferido`, `cumprido`, `recurso`, `arquivado`
- Tipos: `liminar`, `tutela_antecipada`, `acao_principal`, `recurso`
- Controle de datas: ajuizamento, liminar, validade
- Quando marcado como "cumprido", atualiza automaticamente as dívidas ativas do cliente para "limpa"

### Apontamentos BACEN
- Tipos: CCF, PEFIN, REFIN, Outro
- Controle de status: `ativo`, `em_processo`, `removido`
- Registro de instituição financeira, valor e datas

### Tarefas
- Sistema completo de follow-ups e prazos
- Prioridades: `baixa`, `normal`, `alta`, `urgente`
- Tipos: `contato`, `documento`, `processo`, `financeiro`, `geral`
- Status: `pendente`, `em_andamento`, `concluida`, `cancelada`
- Vinculação com cliente (join com nome do cliente)
- Auto-preenchimento de `data_conclusao` ao marcar como concluída

### Histórico / Timeline
- Registro automático de todas as operações do sistema
- Tipos: `cadastro`, `atualizacao`, `contato`, `divida`, `processo`, `bacen`, `tarefa`, `score`, `webhook`
- Suporte a `dados_extra` (JSONB) para metadados adicionais

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│                                                              │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │  CDN Estático │    │    Serverless Function            │   │
│  │  public/      │    │    api/index.js → app.js          │   │
│  │  ├─ index.html│    │    ├─ routes/clientes.js          │   │
│  │  ├─ css/      │    │    ├─ routes/dividas.js           │   │
│  │  └─ js/       │    │    ├─ routes/processos.js         │   │
│  │               │    │    ├─ routes/bacen.js              │   │
│  │               │    │    ├─ routes/historico.js          │   │
│  │               │    │    ├─ routes/tarefas.js            │   │
│  │               │    │    ├─ routes/dashboard.js          │   │
│  │               │    │    └─ routes/webhook.js            │   │
│  └──────┬───────┘    └────────────┬─────────────────────┘   │
│         │                          │                          │
└─────────┼──────────────────────────┼──────────────────────────┘
          │                          │
          │ HTML/CSS/JS              │ @supabase/supabase-js
          │                          │
          ▼                          ▼
    ┌──────────┐            ┌──────────────────┐
    │ Navegador │            │     SUPABASE      │
    │ (SPA)     │───AJAX────▶│   (PostgreSQL)    │
    └──────────┘   /api/*    │                   │
                             │  7 tabelas        │
                             │  1 view           │
                             │  1 função RPC     │
                             └──────────────────┘
```

### Fluxo de Requisições

1. **Frontend estático** → servido pelo CDN da Vercel (`public/`)
2. **Chamadas API** (`/api/*`) → roteadas para a Serverless Function (`api/index.js`)
3. **Serverless Function** → Express app que usa o client Supabase JS para acessar o PostgreSQL
4. **Webhooks** (`/api/webhook/*`) → recebem dados de integrações externas e gravam no Supabase

---

## Estrutura de Arquivos

```
limpanome/
├── api/
│   └── index.js              # Entry point Vercel (exporta Express app)
├── lib/
│   └── supabase.js           # Client Supabase (inicialização + validação)
├── routes/
│   ├── clientes.js           # CRUD clientes + busca + paginação
│   ├── dividas.js            # CRUD dívidas
│   ├── processos.js          # CRUD processos/liminares
│   ├── bacen.js              # CRUD apontamentos BACEN
│   ├── historico.js          # Timeline/histórico
│   ├── tarefas.js            # CRUD tarefas + join com clientes
│   ├── dashboard.js          # Métricas via RPC get_dashboard_stats()
│   └── webhook.js            # Webhooks (Google Forms, WhatsApp, genérico)
├── public/
│   ├── index.html            # SPA principal (ponto de entrada)
│   ├── css/
│   │   └── style.css         # Design system completo (variáveis, componentes)
│   └── js/
│       ├── api.js            # Cliente HTTP (fetch wrapper)
│       ├── utils.js          # Formatadores (CPF, moeda, data) e helpers
│       ├── components.js     # Componentes reutilizáveis (modais, toasts, tabelas)
│       ├── app.js            # Controlador do SPA (router hash-based)
│       └── pages/
│           ├── dashboard.js       # Página do dashboard
│           ├── clientes.js        # Listagem de clientes
│           ├── cliente-detalhe.js # Detalhe/edição do cliente
│           ├── processos.js       # Listagem de processos
│           ├── tarefas.js         # Listagem de tarefas
│           └── pipeline.js        # Pipeline visual (Kanban)
├── app.js                    # Express app (API only, sem listen/static)
├── server.js                 # Servidor local dev (static + listen na porta 3000)
├── vercel.json               # Config de rotas e builds para Vercel
├── supabase-schema.sql       # Schema completo do banco (rodar no SQL Editor)
├── package.json              # Dependências e scripts
├── .env.example              # Template de variáveis de ambiente
├── .gitignore                # Ignora node_modules, .env, data/, .vercel
└── README.md                 # Esta documentação
```

---

## Banco de Dados (Supabase)

### Acesso

- **Plataforma:** [https://supabase.com/dashboard](https://supabase.com/dashboard)
- **Conta:** `alan.moreira@amconsultoria.site`
- **Tipo:** PostgreSQL 15 (gerenciado pelo Supabase)

### Schema

O schema completo está em `supabase-schema.sql`. Para (re)criar, cole o conteúdo no **SQL Editor** do Supabase.

### Tabelas

| Tabela | Descrição | Registros-chave |
|--------|-----------|----------------|
| `clientes` | Dados pessoais, contato e status do cliente | uuid, cpf, status, origem, score |
| `dividas` | Dívidas registradas em bureaus | cliente_id FK, credor, bureau, valor, status |
| `processos` | Liminares e ações judiciais | cliente_id FK, tipo, bureaus_alvo (JSONB), status |
| `apontamentos_bacen` | Registros BACEN (CCF, PEFIN, REFIN) | cliente_id FK, tipo, instituicao, status |
| `historico` | Timeline de eventos do cliente | cliente_id FK, tipo, descricao, dados_extra (JSONB) |
| `score_historico` | Evolução do score de crédito | cliente_id FK, bureau, score, data_consulta |
| `tarefas` | Follow-ups, prazos e atividades | cliente_id FK (nullable), prioridade, status |

### View

| View | Descrição |
|------|-----------|
| `clientes_view` | Clientes com contagem agregada de dívidas, valor total de dívidas e total de processos. Usada na listagem principal. |

### Função RPC

| Função | Descrição |
|--------|-----------|
| `get_dashboard_stats()` | Retorna todas as métricas do dashboard em uma única chamada: total de clientes, contagem por status, processos ativos, dívidas ativas, valor total, score médio, tarefas pendentes/vencidas, liminares expirando, clientes recentes e últimas atividades. |

### Diagrama ER (simplificado)

```
clientes (1) ──────── (N) dividas
    │
    ├── (1) ──────── (N) processos
    │
    ├── (1) ──────── (N) apontamentos_bacen
    │
    ├── (1) ──────── (N) historico
    │
    ├── (1) ──────── (N) score_historico
    │
    └── (1) ──────── (N) tarefas
```

### Índices

- `idx_clientes_cpf` — busca por CPF
- `idx_clientes_status` — filtro por status
- `idx_clientes_telefone` — busca por telefone
- `idx_dividas_cliente` — dívidas por cliente
- `idx_processos_cliente` — processos por cliente
- `idx_processos_status` — filtro de processos por status
- `idx_bacen_cliente` — apontamentos por cliente
- `idx_historico_cliente` — histórico por cliente
- `idx_tarefas_cliente` — tarefas por cliente
- `idx_tarefas_status` — filtro de tarefas por status

---

## API Endpoints

### Clientes

| Método | Endpoint | Descrição | Query Params |
|--------|----------|-----------|-------------|
| GET | `/api/clientes` | Listar clientes (paginado) | `status`, `origem`, `busca`, `page`, `limit` |
| GET | `/api/clientes/:id` | Detalhe completo (com dívidas, processos, BACEN, histórico) | — |
| POST | `/api/clientes` | Criar cliente | — |
| PUT | `/api/clientes/:id` | Atualizar cliente | — |
| DELETE | `/api/clientes/:id` | Excluir cliente (cascade) | — |

### Dívidas

| Método | Endpoint | Descrição | Query Params |
|--------|----------|-----------|-------------|
| GET | `/api/dividas` | Listar dívidas | `cliente_id`, `bureau`, `status` |
| GET | `/api/dividas/:id` | Detalhe da dívida | — |
| POST | `/api/dividas` | Cadastrar dívida | — |
| PUT | `/api/dividas/:id` | Atualizar dívida | — |
| DELETE | `/api/dividas/:id` | Excluir dívida | — |

### Processos

| Método | Endpoint | Descrição | Query Params |
|--------|----------|-----------|-------------|
| GET | `/api/processos` | Listar processos | `cliente_id`, `status`, `tipo` |
| GET | `/api/processos/:id` | Detalhe do processo | — |
| POST | `/api/processos` | Cadastrar processo | — |
| PUT | `/api/processos/:id` | Atualizar processo | — |
| DELETE | `/api/processos/:id` | Excluir processo | — |

### Apontamentos BACEN

| Método | Endpoint | Descrição | Query Params |
|--------|----------|-----------|-------------|
| GET | `/api/bacen` | Listar apontamentos | `cliente_id`, `tipo`, `status` |
| GET | `/api/bacen/:id` | Detalhe do apontamento | — |
| POST | `/api/bacen` | Cadastrar apontamento | — |
| PUT | `/api/bacen/:id` | Atualizar apontamento | — |
| DELETE | `/api/bacen/:id` | Excluir apontamento | — |

### Histórico

| Método | Endpoint | Descrição | Query Params |
|--------|----------|-----------|-------------|
| GET | `/api/historico` | Listar histórico | `cliente_id`, `tipo`, `limit` |
| POST | `/api/historico` | Adicionar registro | — |
| DELETE | `/api/historico/:id` | Excluir registro | — |

### Tarefas

| Método | Endpoint | Descrição | Query Params |
|--------|----------|-----------|-------------|
| GET | `/api/tarefas` | Listar tarefas (paginado, com nome do cliente) | `cliente_id`, `status`, `prioridade`, `page`, `limit` |
| GET | `/api/tarefas/:id` | Detalhe da tarefa | — |
| POST | `/api/tarefas` | Criar tarefa | — |
| PUT | `/api/tarefas/:id` | Atualizar tarefa | — |
| DELETE | `/api/tarefas/:id` | Excluir tarefa | — |

### Dashboard & Health

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard` | Métricas completas (via RPC `get_dashboard_stats`) |
| GET | `/api/health` | Health check (retorna `{ status: 'ok', timestamp }`) |

### Webhooks

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/webhook/forms` | Google Forms / Typeform |
| POST | `/api/webhook/whatsapp` | WhatsApp (Z-API, Baileys, Evolution API) |
| POST | `/api/webhook/generic` | Webhook genérico para qualquer plataforma |

---

## Webhooks & Integrações

### Google Forms

O webhook `/api/webhook/forms` aceita os seguintes campos (case-insensitive):

| Campo | Alternativas aceitas |
|-------|---------------------|
| nome | `Nome Completo`, `nome_completo` |
| cpf | `CPF` |
| telefone | `Telefone`, `WhatsApp` |
| email | `E-mail`, `Email` |
| cidade | `Cidade` |
| estado | `Estado` |
| renda_mensal | — |
| observacoes | `Observações` |

**Comportamento:**
- Se o CPF ou telefone já existir, registra no histórico como contato duplicado
- Se for novo, cria o cliente como `lead` com origem `google_forms`
- Cria automaticamente uma tarefa de follow-up com prioridade `alta` (vence em 24h)

### WhatsApp (Z-API / Baileys / Evolution API)

O webhook `/api/webhook/whatsapp` detecta automaticamente o formato de diferentes APIs:

| Campo | Alternativas aceitas |
|-------|---------------------|
| telefone | `phone`, `from`, `sender`, `data.from`, `data.key.remoteJid` |
| nome | `pushName`, `name`, `senderName`, `data.pushName`, `contact.name` |
| mensagem | `text.message`, `message.conversation`, `data.message.conversation`, `body` |

**Comportamento:**
- Se o telefone já existir, registra a mensagem no histórico
- Se for novo, cria o lead com origem `whatsapp` e tarefa urgente (vence em 2h)

### Webhook Genérico

O webhook `/api/webhook/generic` aceita: `nome/name`, `cpf`, `telefone/phone`, `email`, `origem/source`, `observacoes`.

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com o schema criado

### Setup

```bash
# 1. Clonar o repositório
git clone https://github.com/alankardecm/limpanome.git
cd limpanome

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as credenciais do Supabase

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

O servidor inicia em **http://localhost:3000** com auto-reload.

### Scripts disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `npm start` | `node server.js` | Inicia o servidor (produção local) |
| `npm run dev` | `node --watch server.js` | Inicia com auto-reload (desenvolvimento) |

### Diferença entre local e Vercel

| Aspecto | Local (`server.js`) | Vercel (`api/index.js`) |
|---------|--------------------|-----------------------|
| Arquivos estáticos | Express `express.static()` | Vercel CDN |
| SPA fallback | Express `app.get('*', ...)` | `vercel.json` routes |
| Porta | `PORT` env ou 3000 | Gerenciado pela Vercel |
| Entry point | `server.js` → importa `app.js` | `api/index.js` → importa `app.js` |

---

## Deploy na Vercel

### Primeiro deploy

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New..." → "Project"**
3. Importe o repositório `alankardecm/limpanome` do GitHub
4. Em **Environment Variables**, adicione:
   - `SUPABASE_URL` → URL do projeto Supabase
   - `SUPABASE_ANON_KEY` → chave anônima pública do Supabase
5. Clique em **Deploy**

### Deploys subsequentes

Qualquer push para a branch `main` dispara deploy automático na Vercel.

```bash
git add -A
git commit -m "descrição da alteração"
git push
```

### Configuração (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*\\.(js|css|ico|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot))", "dest": "/public/$1" },
    { "src": "/(.*)", "dest": "/public/index.html" }
  ]
}
```

**Regras de roteamento:**
1. `/api/*` → Serverless Function (Express)
2. Arquivos estáticos (JS, CSS, imagens) → CDN (`public/`)
3. Qualquer outra rota → `index.html` (SPA fallback)

---

## Configuração do Supabase

### Acesso ao painel

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Login: `alan.moreira@amconsultoria.site`
3. Selecione o projeto

### Criar/Recriar schema

1. No painel do Supabase, vá em **SQL Editor**
2. Cole o conteúdo completo do arquivo `supabase-schema.sql`
3. Clique em **Run**
4. Verifique que as 7 tabelas, 1 view e 1 função foram criadas em **Table Editor**

### Obter credenciais

1. No painel do Supabase, vá em **Settings → API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### Segurança (Row Level Security)

Por padrão, o schema é criado **sem RLS ativo** para simplificar o desenvolvimento. Para produção com acesso público, considere:

1. Ativar RLS nas tabelas
2. Criar policies adequadas
3. Usar a `service_role` key no backend (mais permissiva) em vez da `anon` key
4. Nunca expor a `service_role` key no frontend

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição | Onde obter |
|----------|-------------|-----------|-----------|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | ✅ | Chave anônima pública | Supabase → Settings → API → anon public |
| `PORT` | ❌ | Porta do servidor local (padrão: 3000) | — |

### Configurar na Vercel

1. Painel da Vercel → Projeto → **Settings → Environment Variables**
2. Adicione `SUPABASE_URL` e `SUPABASE_ANON_KEY`
3. Aplique para os ambientes: Production, Preview, Development

### Configurar localmente

```bash
cp .env.example .env
# Editar .env:
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## Guia de Integrações

### Google Forms → CRM

1. Crie um formulário no Google Forms com os campos desejados
2. No editor do Forms, vá em **⋮ → Script editor** (Apps Script)
3. Cole o seguinte código:

```javascript
function onFormSubmit(e) {
  var responses = e.response.getItemResponses();
  var data = {};
  responses.forEach(function(r) {
    data[r.getItem().getTitle()] = r.getResponse();
  });

  UrlFetchApp.fetch('https://SEU-APP.vercel.app/api/webhook/forms', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  });
}
```

4. Configure um **trigger** `onFormSubmit` para executar a cada envio
5. Substitua `SEU-APP.vercel.app` pela URL real do seu deploy

### WhatsApp (Z-API) → CRM

1. No painel da Z-API, configure o webhook de mensagens recebidas:
   ```
   https://SEU-APP.vercel.app/api/webhook/whatsapp
   ```
2. O CRM detecta automaticamente o formato da Z-API

### WhatsApp (Baileys / Evolution API) → CRM

1. No código do bot, envie as mensagens recebidas para:
   ```
   POST https://SEU-APP.vercel.app/api/webhook/whatsapp
   ```
2. O sistema aceita os formatos nativos do Baileys e Evolution API

### Typeform / Outros formulários → CRM

Use o webhook genérico:
```
POST https://SEU-APP.vercel.app/api/webhook/generic
Content-Type: application/json

{
  "nome": "Nome do Lead",
  "cpf": "123.456.789-00",
  "telefone": "(11) 99999-0000",
  "email": "lead@email.com",
  "origem": "typeform",
  "observacoes": "Interessado em limpar nome"
}
```

---

## Manutenção

### Logs

- **Vercel:** Painel → Projeto → **Deployments** → selecionar deploy → **Functions** → ver logs
- **Supabase:** Painel → **Logs** → selecionar serviço (API, Database, Auth)

### Backup do banco

O Supabase faz backups automáticos diários. Para backup manual:
1. Supabase → **Settings → Database**
2. Use a connection string para conectar via `pg_dump`

### Monitoramento

- `/api/health` retorna `{ status: 'ok', timestamp }` — pode ser usado com UptimeRobot ou similar

---

## Licença

ISC

---

*Documentação gerada em Fevereiro de 2026 — CRM Limpa Nome v2.0.0*
