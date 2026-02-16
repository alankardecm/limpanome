# 🛡️ CRM Limpa Nome

Sistema CRM completo para gestão de clientes do projeto **Limpa Nome** — serviço jurídico de limpeza de nome em bureaus de crédito (SCPC, Serasa, BACEN) via liminares judiciais.

> **URL de Produção**: https://limpanome-t73d.vercel.app  
> **Repositório**: https://github.com/alankardecm/limpanome

---

## 📑 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Stack Tecnológica](#-stack-tecnológica)
4. [Estrutura de Pastas](#-estrutura-de-pastas)
5. [Instalação Local](#-instalação-local)
6. [Configuração do Supabase](#-configuração-do-supabase)
7. [Deploy na Vercel](#-deploy-na-vercel)
8. [Autenticação](#-autenticação)
9. [Funcionalidades do CRM](#-funcionalidades-do-crm)
10. [API — Endpoints](#-api--endpoints)
11. [Google Forms — Captação de Leads](#-google-forms--captação-de-leads)
12. [Sistema de Documentos (PDFs)](#-sistema-de-documentos-pdfs)
13. [Banco de Dados — Tabelas](#-banco-de-dados--tabelas)
14. [Variáveis de Ambiente](#-variáveis-de-ambiente)
15. [Guia de Uso do CRM](#-guia-de-uso-do-crm)
16. [Troubleshooting](#-troubleshooting)

---

## 🎯 Visão Geral

O **CRM Limpa Nome** é uma aplicação web que gerencia todo o ciclo de vida dos clientes que contratam serviços de:

| Serviço | Descrição |
|---------|-----------|
| **Diagnóstico Financeiro** | Análise completa da situação de crédito do cliente |
| **Limpa Nome (SCPC, Serasa, etc)** | Remoção de negativações via liminares judiciais |
| **Score** | Recuperação e aumento do score de crédito |
| **Rating** | Melhoria do rating financeiro |
| **BACEN** | Tratamento de apontamentos no Banco Central |

### Fluxo do Cliente

```
Google Forms → Lead captado → Análise → Processo/Liminar → Acompanhamento → Conclusão
     ↓                                        ↓
  Webhook automático              Upload PDF (antes/depois)
     ↓                                        ↓
  CRM cria cliente              Comparação visual de resultados
```

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    VERCEL (CDN + Serverless)          │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────────┐   │
│  │  Static Files │    │  Serverless Functions      │  │
│  │  (public/)    │    │  api/index.js → app.js     │  │
│  │  HTML/CSS/JS  │    │   ├── routes/auth.js       │  │
│  │               │    │   ├── routes/clientes.js   │  │
│  │               │    │   ├── routes/dividas.js    │  │
│  │               │    │   ├── routes/processos.js  │  │
│  │               │    │   ├── routes/bacen.js      │  │
│  │               │    │   ├── routes/tarefas.js    │  │
│  │               │    │   ├── routes/historico.js   │  │
│  │               │    │   ├── routes/dashboard.js  │  │
│  │               │    │   ├── routes/documentos.js │  │
│  │               │    │   └── routes/webhook.js    │  │
│  └──────────────┘    └───────────────────────────┘   │
└───────────────────────────┬──────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │     SUPABASE (Cloud)     │
               │  ┌────────┐ ┌─────────┐ │
               │  │PostgreSQL│ │ Storage │ │
               │  │ 9 tables │ │  PDFs   │ │
               │  │ 1 view   │ │ bucket  │ │
               │  │ 1 RPC    │ │"documen"│ │
               │  └────────┘ └─────────┘ │
               └─────────────────────────┘
```

**Fluxo de uma requisição**:
1. Browser acessa `https://limpanome-t73d.vercel.app`
2. Vercel serve `index.html` do CDN (SPA em Vanilla JS)
3. Frontend faz `fetch('/api/...')` com token JWT no header
4. Vercel roteia para serverless function (`api/index.js` → Express `app.js`)
5. Express valida JWT, processa rota, consulta Supabase
6. Resposta JSON retorna ao frontend

---

## 🔧 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript (SPA) | - |
| **Backend** | Node.js + Express | 18+ / 4.21 |
| **Banco de Dados** | Supabase (PostgreSQL) | - |
| **Armazenamento** | Supabase Storage (bucket `documentos`) | - |
| **Autenticação** | JWT (`jsonwebtoken`) | 9.0 |
| **Upload** | Multer (memória) | 1.4.5 |
| **Hospedagem** | Vercel (CDN + Serverless) | - |
| **Ícones** | Font Awesome | 6.5.1 |
| **Código-fonte** | GitHub | - |

---

## 📁 Estrutura de Pastas

```
limpanome/
├── api/
│   └── index.js              # Entry point Vercel serverless
├── lib/
│   ├── supabase.js           # Cliente Supabase configurado
│   └── authMiddleware.js     # Middleware JWT
├── routes/
│   ├── auth.js               # Login / verificação de token
│   ├── clientes.js           # CRUD de clientes
│   ├── dividas.js            # CRUD de dívidas
│   ├── processos.js          # CRUD de processos/liminares
│   ├── bacen.js              # CRUD de apontamentos BACEN
│   ├── historico.js          # Timeline do cliente
│   ├── tarefas.js            # CRUD de tarefas/follow-ups
│   ├── dashboard.js          # Métricas e estatísticas
│   ├── documentos.js         # Upload/download de PDFs
│   └── webhook.js            # Google Forms + WhatsApp
├── public/
│   ├── css/
│   │   └── style.css         # Design system completo
│   ├── js/
│   │   ├── api.js            # Cliente HTTP (fetch + JWT)
│   │   ├── auth.js           # Login/logout frontend
│   │   ├── app.js            # Controlador SPA + modal cliente
│   │   ├── utils.js          # Formatadores (CPF, data, moeda)
│   │   ├── components.js     # Componentes reutilizáveis
│   │   └── pages/
│   │       ├── dashboard.js      # Painel de métricas
│   │       ├── clientes.js       # Listagem de clientes
│   │       ├── cliente-detalhe.js # Ficha completa do cliente
│   │       ├── processos.js      # Listagem de processos
│   │       ├── tarefas.js        # Gestão de tarefas
│   │       └── pipeline.js       # Pipeline visual (Kanban)
│   └── index.html            # Página única (SPA)
├── app.js                    # Express app (rotas + middleware)
├── server.js                 # Servidor local (dev)
├── vercel.json               # Config de deploy Vercel
├── supabase-schema.sql       # Schema completo do banco
├── google-apps-script.js     # Script do Google Forms webhook
├── package.json
├── .env                      # Variáveis locais (não comitado)
├── .env.example              # Exemplo de variáveis
└── .gitignore
```

---

## 💻 Instalação Local

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuito)
- Git

### Passo a passo

```bash
# 1. Clonar o repositório
git clone https://github.com/alankardecm/limpanome.git
cd limpanome

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (veja seção "Variáveis de Ambiente")

# 4. Iniciar em modo desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

---

## 🗄️ Configuração do Supabase

### 1. Criar o Projeto

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Escolha uma organização, nome (ex: `Limpa Nome`), senha do banco e região (**South America - São Paulo**)
4. Aguarde a criação (~2 min)

### 2. Executar o Schema

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole **todo o conteúdo** do arquivo `supabase-schema.sql`
4. Clique em **Run** (ou Ctrl+Enter)
5. Deve retornar "Success. No rows returned" — isso é normal

### 3. Criar o Bucket de Storage (para PDFs)

1. No menu lateral, vá em **Storage**
2. Clique em **New Bucket**
3. Nome: `documentos`
4. Marque ✅ **Public bucket**
5. Clique em **Create bucket**

### 4. Configurar Política de Storage

1. Em Storage, clique no bucket `documentos`
2. Vá na aba **Policies**
3. Clique em **New Policy** → **For full customization**
4. Configure:
   - Name: `Allow all operations`
   - Target roles: `anon`, `authenticated`
   - Operations: ✅ SELECT, ✅ INSERT, ✅ UPDATE, ✅ DELETE
5. Salve

### 5. Obter Credenciais

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL** → para `SUPABASE_URL`
   - **anon public key** → para `SUPABASE_ANON_KEY`

---

## 🚀 Deploy na Vercel

### 1. Importar Projeto

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New** → **Project**
3. Selecione o repositório `limpanome`
4. Framework Preset: **Other**
5. Clique em **Deploy**

### 2. Configurar Variáveis de Ambiente

Em **Settings** → **Environment Variables**, adicione:

| Variável | Valor | Obrigatório |
|----------|-------|:-----------:|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | ✅ |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | ✅ |
| `JWT_SECRET` | qualquer string secreta longa | ✅ |
| `CRM_PASSWORD` | senha de acesso ao CRM (padrão: `limpanome2026`) | ⬜ |

### 3. Redeploy

Após adicionar as variáveis, vá em **Deployments** → clique nos **...** do último deploy → **Redeploy**.

### 4. Deploy Automático

Cada `git push origin main` faz deploy automático na Vercel.

---

## 🔐 Autenticação

O sistema usa **JWT (JSON Web Token)** com lista de emails autorizados.

### Emails com acesso

| Email | Observação |
|-------|-----------|
| `alankardecm@gmail.com` | Admin principal |
| `o.janaina2004@gmail.com` | Operadora |

### Senha padrão

`limpanome2026` (configurável via variável de ambiente `CRM_PASSWORD`)

### Como funciona

1. Usuário acessa o CRM → tela de login
2. Digita email + senha → `POST /api/auth/login`
3. Backend verifica email na whitelist + valida senha
4. Se OK, retorna JWT com validade de **7 dias**
5. Frontend armazena token no `localStorage`
6. Todas as requisições incluem `Authorization: Bearer <token>`
7. Token expirado → redireciona para login automaticamente

### Adicionar novos usuários

Edite o arquivo `routes/auth.js`, array `ALLOWED_EMAILS`:

```javascript
const ALLOWED_EMAILS = [
  'alankardecm@gmail.com',
  'o.janaina2004@gmail.com',
  'novo.usuario@email.com'  // ← adicione aqui
];
```

Faça commit, push, e o Vercel redeployará automaticamente.

### Alterar a senha

Opção 1: Altere a variável `CRM_PASSWORD` nas Environment Variables da Vercel.

Opção 2: Altere o valor padrão em `routes/auth.js`.

---

## ✨ Funcionalidades do CRM

### 📊 Dashboard

Painel principal com métricas em tempo real:
- Total de clientes, processos, dívidas
- Clientes por status (Lead, Análise, Processo, Concluído, Cancelado)
- Clientes por origem (Manual, Forms, WhatsApp)
- Processos por status
- Score médio dos clientes
- BACEN: ativos vs removidos
- Tarefas pendentes, urgentes e vencidas
- Últimos clientes cadastrados
- Últimas atividades (timeline)
- Liminares expirando nos próximos 30 dias

### 👥 Clientes

- **Listagem** com busca (nome, CPF, telefone, email), filtros por status e origem, paginação
- **Cadastro** com formulário completo: dados pessoais, contato, endereço, serviço contratado, score
- **Ficha do cliente** com abas:
  - **Geral** — dados pessoais + contato
  - **Dívidas** — lista de negativações com credor, valor, bureau
  - **Processos** — liminares vinculadas com status detalhado
  - **BACEN** — apontamentos no Banco Central
  - **Score** — acompanhamento de evolução
  - **Histórico** — timeline de todas as ações
  - **Tarefas** — follow-ups vinculados
  - **Documentos** — upload de PDFs com comparação antes/depois

### Status do cliente

| Status | Descrição |
|--------|-----------|
| `lead` | Novo contato, ainda não contatado |
| `analise` | Em análise de viabilidade |
| `processo` | Processo/liminar em andamento |
| `concluido` | Serviço finalizado com sucesso |
| `cancelado` | Cliente desistiu ou inviável |

### ⚖️ Processos

- Cadastro de liminares com número do processo, advogado, vara, comarca
- Status: preparando, em_andamento, protocolado, deferido, indeferido, cumprido, arquivado
- Bureaus alvo (SCPC, Serasa, Boa Vista, etc.)
- Datas de ajuizamento, liminar, cumprimento e validade
- Honorários e custas

### ✅ Tarefas

- Tarefas de follow-up vinculadas a clientes
- Tipos: geral, contato, documento, audiência, prazo
- Prioridades: baixa, média, alta, urgente
- Status: pendente, em_andamento, concluída, cancelada
- Filtros por status e prioridade

### 🔀 Pipeline

- Visão Kanban dos clientes por status
- Arraste visual (cards por coluna)
- Totalizadores por coluna

### 📄 Documentos

- Upload de PDF, PNG, JPG (máximo 10MB)
- Tipos: Consulta ANTES, Consulta DEPOIS, Contrato, Procuração, Comprovante, Outro
- Visualização, download e exclusão
- **Comparação lado a lado** (Antes × Depois) para comprovar resultado do serviço

---

## 🔌 API — Endpoints

Todas as rotas (exceto auth e webhook) requerem header:
```
Authorization: Bearer <token_jwt>
```

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login (email + password) → retorna JWT |
| `GET` | `/api/auth/me` | Verificar token → retorna dados do usuário |

### Clientes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/clientes` | Listar (query: `busca`, `status`, `origem`, `page`, `limit`) |
| `GET` | `/api/clientes/:id` | Detalhes completos (inclui dívidas, processos, BACEN, histórico) |
| `POST` | `/api/clientes` | Criar cliente |
| `PUT` | `/api/clientes/:id` | Atualizar cliente |
| `DELETE` | `/api/clientes/:id` | Excluir cliente |

### Dívidas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/dividas` | Listar (query: `cliente_id`, `status`) |
| `POST` | `/api/dividas` | Criar dívida |
| `PUT` | `/api/dividas/:id` | Atualizar dívida |
| `DELETE` | `/api/dividas/:id` | Excluir dívida |

### Processos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/processos` | Listar (query: `cliente_id`, `status`, `page`, `limit`) |
| `GET` | `/api/processos/:id` | Detalhes do processo |
| `POST` | `/api/processos` | Criar processo |
| `PUT` | `/api/processos/:id` | Atualizar processo |
| `DELETE` | `/api/processos/:id` | Excluir processo |

### BACEN

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/bacen` | Listar (query: `cliente_id`, `status`) |
| `POST` | `/api/bacen` | Criar apontamento |
| `PUT` | `/api/bacen/:id` | Atualizar apontamento |
| `DELETE` | `/api/bacen/:id` | Excluir apontamento |

### Histórico

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/historico` | Listar (query: `cliente_id`) |
| `POST` | `/api/historico` | Criar registro |

### Tarefas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/tarefas` | Listar (query: `cliente_id`, `status`, `prioridade`, `page`, `limit`) |
| `POST` | `/api/tarefas` | Criar tarefa |
| `PUT` | `/api/tarefas/:id` | Atualizar tarefa |
| `DELETE` | `/api/tarefas/:id` | Excluir tarefa |

### Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/dashboard` | Todas as métricas (RPC `get_dashboard_stats()`) |

### Documentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/documentos?cliente_id=X` | Listar documentos do cliente |
| `POST` | `/api/documentos/upload` | Upload de arquivo (multipart/form-data) |
| `DELETE` | `/api/documentos/:id` | Excluir documento (banco + storage) |

**Upload — campos do form-data:**
- `arquivo` — o arquivo (PDF/PNG/JPG, máx 10MB)
- `cliente_id` — ID do cliente
- `tipo` — `consulta_antes`, `consulta_depois`, `contrato`, `procuracao`, `comprovante`, `outro`
- `descricao` — descrição opcional

### Webhooks (públicos, sem autenticação)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/webhook/forms` | Google Forms → cria lead automaticamente |
| `POST` | `/api/webhook/whatsapp` | WhatsApp API → cria/atualiza contato |

### Health Check

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Verificar se a API está no ar |

---

## 📝 Google Forms — Captação de Leads

O Google Forms alimenta automaticamente o CRM com novos leads.

### Passo 1 — Criar o Formulário

Acesse [forms.google.com](https://forms.google.com) e crie um formulário com **exatamente** estes campos:

| # | Pergunta | Tipo no Forms | Obrigatório |
|---|----------|---------------|:-----------:|
| 1 | **Nome Completo** | Resposta curta | ✅ |
| 2 | **CPF** | Resposta curta | ✅ |
| 3 | **Data Nascimento** | Data | ✅ |
| 4 | **Telefone** | Resposta curta | ✅ |
| 5 | **Email** | Resposta curta | ⬜ |
| 6 | **Cidade** | Resposta curta | ⬜ |
| 7 | **Estado** | Lista suspensa | ⬜ |
| 8 | **Serviço Contratado** | Caixas de seleção | ✅ |
| 9 | **Observações** | Parágrafo | ⬜ |

> ⚠️ **Os nomes das perguntas devem ser exatamente iguais** (maiúsculas, acentos) pois o script usa `e.namedValues['Nome Completo']` para mapear.

**Opções do campo "Estado"** (lista suspensa):
```
AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO
```
> Dica: cole tudo de uma vez no campo "Opção 1" — o Forms separa por linha.

**Opções do campo "Serviço Contratado"** (caixas de seleção):
```
Diagnóstico Financeiro
Limpa Nome (SCPC, Serasa, etc)
Score
Rating
BACEN
```

### Passo 2 — Adicionar o Apps Script

1. No formulário, clique nos **⋮** (três pontinhos, canto superior direito)
2. Clique em **Apps Script**
3. **Apague** todo o código padrão
4. Cole o conteúdo do arquivo `google-apps-script.js`:

```javascript
function onFormSubmit(e) {
  var r = e.namedValues;

  var payload = {
    nome:               (r['Nome Completo'] || [''])[0],
    cpf:                (r['CPF'] || [''])[0],
    data_nascimento:    (r['Data Nascimento'] || [''])[0],
    telefone:           (r['Telefone'] || [''])[0],
    email:              (r['Email'] || [''])[0],
    cidade:             (r['Cidade'] || [''])[0],
    estado:             (r['Estado'] || [''])[0],
    servico_contratado: (r['Serviço Contratado'] || [''])[0],
    observacoes:        (r['Observações'] || [''])[0]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(
    'https://limpanome-t73d.vercel.app/api/webhook/forms',
    options
  );

  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}

function testeManual() {
  var payload = {
    nome: 'Teste Google Forms',
    cpf: '00000000000',
    telefone: '11999999999',
    email: 'teste@teste.com',
    cidade: 'São Paulo',
    estado: 'SP',
    servico_contratado: 'Diagnóstico Financeiro, Limpa Nome (SCPC, Serasa, etc)',
    observacoes: 'Cadastro de teste via Apps Script'
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(
    'https://limpanome-t73d.vercel.app/api/webhook/forms',
    options
  );

  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}
```

5. Clique em **💾 Salvar** (Ctrl+S)

### Passo 3 — Testar

1. No dropdown ao lado do botão ▶, selecione **`testeManual`**
2. Clique em **▶ Executar**
3. Na primeira vez, clique em **Revisar permissões** → sua conta → **Avançado** → **Acessar Projeto (não seguro)** → **Permitir**
4. Verifique no CRM se apareceu o cliente "Teste Google Forms"

### Passo 4 — Criar Gatilho Automático

1. No Apps Script, clique no ícone **⏰ Gatilhos** (menu lateral esquerdo)
2. Clique em **+ Adicionar gatilho**
3. Configure:
   - **Função**: `onFormSubmit`
   - **Origem do evento**: Do formulário
   - **Tipo de evento**: Ao enviar o formulário
4. Clique em **Salvar**

### O que acontece a cada envio

1. Alguém preenche o formulário
2. Apps Script dispara `onFormSubmit`
3. Dados são enviados via `POST` para `/api/webhook/forms`
4. Webhook verifica se CPF/telefone já existe (evita duplicatas)
5. Se novo → cria cliente com status `lead` e origem `google_forms`
6. Cria tarefa automática: "Contatar lead: [nome]" com prioridade alta (24h)
7. Se duplicado → registra no histórico do cliente existente

---

## 📄 Sistema de Documentos (PDFs)

### Como usar

1. Abra a ficha de um cliente
2. Clique na aba **Documentos**
3. Selecione o **tipo** do documento:
   - **Consulta ANTES** — situação inicial do cliente (ex: print da Serasa negativado)
   - **Consulta DEPOIS** — resultado após o serviço (ex: print da Serasa limpo)
   - **Contrato** — contrato de prestação de serviço
   - **Procuração** — procuração assinada
   - **Comprovante** — comprovante de pagamento
   - **Outro** — qualquer outro documento
4. Opcionalmente, adicione uma **descrição** (ex: "Consulta Serasa Jan/2026")
5. Selecione o **arquivo** (PDF, PNG ou JPG — máximo 10MB)
6. Clique em **Enviar**

### Comparação Antes × Depois

1. Envie pelo menos um documento do tipo **Consulta ANTES**
2. Após o serviço, envie um documento do tipo **Consulta DEPOIS**
3. Clique no botão **Comparar Antes x Depois**
4. Os documentos aparecem **lado a lado** em tela cheia
5. Ideal para mostrar ao cliente o resultado do trabalho

### Onde ficam armazenados

Os arquivos ficam no **Supabase Storage** (bucket `documentos`), organizados por cliente:
```
documentos/
├── cliente_1/
│   ├── consulta_antes_1707912345678.pdf
│   └── consulta_depois_1708012345678.pdf
├── cliente_2/
│   ├── contrato_1707812345678.pdf
│   └── consulta_antes_1707912345678.jpg
└── ...
```

---

## 🗃️ Banco de Dados — Tabelas

### `clientes` — Tabela principal
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID auto-incremento |
| `uuid` | UUID | Identificador único universal |
| `nome` | TEXT | Nome completo (obrigatório) |
| `cpf` | TEXT | CPF sem formatação (obrigatório) |
| `rg` | TEXT | RG |
| `email` | TEXT | E-mail |
| `telefone` | TEXT | Telefone principal (obrigatório) |
| `telefone2` | TEXT | Telefone secundário |
| `data_nascimento` | DATE | Data de nascimento |
| `endereco` | TEXT | Endereço completo |
| `cidade` | TEXT | Cidade |
| `estado` | TEXT | UF |
| `cep` | TEXT | CEP |
| `profissao` | TEXT | Profissão |
| `renda_mensal` | NUMERIC(12,2) | Renda mensal |
| `estado_civil` | TEXT | Estado civil |
| `servico_contratado` | TEXT | Serviços (vírgula-separados) |
| `origem` | TEXT | `manual`, `google_forms`, `whatsapp` |
| `status` | TEXT | `lead`, `analise`, `processo`, `concluido`, `cancelado` |
| `score_inicial` | INTEGER | Score na entrada |
| `score_atual` | INTEGER | Score atual |
| `observacoes` | TEXT | Observações gerais |
| `data_cadastro` | TIMESTAMPTZ | Data de criação |
| `data_atualizacao` | TIMESTAMPTZ | Última atualização |

### `dividas` — Negativações do cliente
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `credor` | TEXT | Nome do credor |
| `valor_original` | NUMERIC(12,2) | Valor original |
| `valor_atualizado` | NUMERIC(12,2) | Valor atualizado |
| `tipo` | TEXT | cartao_credito, emprestimo, financiamento, servicos, impostos, outros |
| `bureau` | TEXT | SCPC, Serasa, Boa Vista, etc. |
| `data_vencimento` | DATE | Data de vencimento |
| `contrato` | TEXT | Número do contrato |
| `status` | TEXT | ativa, negociando, paga, prescrita, removida |

### `processos` — Liminares judiciais
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `numero_processo` | TEXT | Número do processo judicial |
| `tipo` | TEXT | liminar, acao_principal, recurso |
| `advogado` | TEXT | Nome do advogado |
| `escritorio` | TEXT | Nome do escritório |
| `plataforma` | TEXT | Plataforma de protocolo |
| `vara` | TEXT | Vara judicial |
| `comarca` | TEXT | Comarca |
| `status` | TEXT | preparando, em_andamento, protocolado, deferido, indeferido, cumprido, arquivado |
| `bureaus_alvo` | JSONB | Array de bureaus alvo |
| `data_ajuizamento` | DATE | Data de protocolo |
| `data_liminar` | DATE | Data da decisão liminar |
| `data_cumprimento` | DATE | Data de cumprimento |
| `data_validade` | DATE | Validade da liminar |
| `valor_honorarios` | NUMERIC(12,2) | Honorários advocatícios |
| `valor_custas` | NUMERIC(12,2) | Custas processuais |

### `apontamentos_bacen` — Registros BACEN
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `tipo` | TEXT | Tipo do apontamento |
| `instituicao` | TEXT | Instituição financeira |
| `valor` | NUMERIC(12,2) | Valor |
| `data_ocorrencia` | DATE | Data original |
| `status` | TEXT | ativo, removido |
| `processo_id` | INTEGER FK | → processos.id (opcional) |

### `historico` — Timeline de ações
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `tipo` | TEXT | cadastro, atualizacao, contato, documento |
| `descricao` | TEXT | Descrição da ação |
| `usuario` | TEXT | Quem fez |
| `dados_extra` | JSONB | Dados adicionais (opcional) |
| `data_registro` | TIMESTAMPTZ | Data/hora |

### `tarefas` — Follow-ups
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `titulo` | TEXT | Título da tarefa |
| `descricao` | TEXT | Descrição |
| `tipo` | TEXT | geral, contato, documento, audiencia, prazo |
| `prioridade` | TEXT | baixa, media, alta, urgente |
| `status` | TEXT | pendente, em_andamento, concluida, cancelada |
| `data_vencimento` | DATE | Prazo |
| `responsavel` | TEXT | Responsável |
| `data_conclusao` | TIMESTAMPTZ | Data de conclusão |

### `documentos` — Arquivos/PDFs
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `tipo` | TEXT | consulta_antes, consulta_depois, contrato, procuracao, comprovante, outro |
| `descricao` | TEXT | Descrição livre |
| `nome_arquivo` | TEXT | Nome original do arquivo |
| `caminho_storage` | TEXT | Caminho no Supabase Storage |
| `url` | TEXT | URL pública do arquivo |
| `tamanho` | INTEGER | Tamanho em bytes |
| `mimetype` | TEXT | Tipo MIME (application/pdf, image/png, etc.) |
| `data_upload` | TIMESTAMPTZ | Data do upload |

### `score_historico` — Tracking de score
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL PK | ID |
| `cliente_id` | INTEGER FK | → clientes.id |
| `score` | INTEGER | Valor do score |
| `bureau` | TEXT | Bureau consultado |
| `data_consulta` | TIMESTAMPTZ | Data da consulta |

### View: `clientes_view`
Extensão da tabela clientes com campos calculados:
- `total_dividas` — quantidade de dívidas
- `valor_total_dividas` — soma dos valores originais
- `total_processos` — quantidade de processos

### Function: `get_dashboard_stats()`
RPC que retorna todas as métricas do dashboard em uma única chamada.

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SUPABASE_URL` | URL do projeto Supabase | (obrigatório) |
| `SUPABASE_ANON_KEY` | Chave anon pública do Supabase | (obrigatório) |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT | `limpanome-crm-secret-key-2026` |
| `CRM_PASSWORD` | Senha de acesso ao CRM | `limpanome2026` |
| `PORT` | Porta do servidor local | `3000` |

### Arquivo `.env` (exemplo)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=minha-chave-secreta-muito-longa-aqui
CRM_PASSWORD=limpanome2026
PORT=3000
```

---

## 📖 Guia de Uso do CRM

### Fluxo completo de um cliente

#### 1. Captação do lead
- **Via Google Forms**: cliente preenche formulário → lead aparece automaticamente no CRM
- **Via CRM**: clique em **+ Novo Cliente** → preencha os dados → **Cadastrar**

#### 2. Primeiro contato
- Na lista de Clientes, clique no lead
- Vá na aba **Tarefas** — já existe uma tarefa automática "Contatar lead"
- Faça contato, registre no **Histórico** (aba Histórico → Adicionar)
- Altere o status para **Análise** (botão Editar → Status → Análise)

#### 3. Diagnóstico financeiro
- Na aba **Documentos**, faça upload da consulta de crédito como **"Consulta ANTES"**
- Na aba **Dívidas**, cadastre todas as negativações encontradas
- Na aba **BACEN**, cadastre apontamentos do Banco Central (se houver)
- Registre o **Score Inicial** no cadastro do cliente

#### 4. Contratação
- Na aba **Documentos**, faça upload do **Contrato** e **Procuração**
- Selecione os serviços contratados (Editar → Serviços Contratados)
- Altere o status para **Processo**

#### 5. Processo judicial
- Na aba **Processos**, clique em **+ Novo Processo**
- Preencha: número, advogado, vara, comarca, bureaus alvo
- Acompanhe o status: preparando → protocolado → deferido → cumprido

#### 6. Acompanhamento
- Use **Tarefas** para criar lembretes e prazos
- A aba **Histórico** registra tudo automaticamente
- O **Dashboard** mostra visão geral de todos os clientes

#### 7. Conclusão
- Faça nova consulta de crédito → upload como **"Consulta DEPOIS"**
- Clique em **Comparar Antes x Depois** para visualizar os resultados lado a lado
- Atualize o **Score Atual** do cliente
- Altere o status para **Concluído**

### Atalhos e dicas

| Ação | Como fazer |
|------|-----------|
| Buscar cliente | Campo de busca no topo (aceita nome, CPF, telefone) |
| Voltar para lista | Botão ← na ficha do cliente |
| Fechar modal | Clique fora ou tecla ESC |
| Navegação rápida | Sidebar à esquerda (Dashboard, Clientes, Processos, Tarefas, Pipeline) |
| Logout | Botão "Sair" no rodapé da sidebar |

---

## 🔧 Troubleshooting

### "Nenhum cliente encontrado" após deploy
- Verifique se executou o `supabase-schema.sql` no SQL Editor do Supabase
- Verifique se os `GRANT` foram executados (permissões para anon)
- Verifique se as variáveis de ambiente estão corretas na Vercel

### Erro 401 / Redirecionando para login
- Token JWT expirou (válido por 7 dias) → faça login novamente
- Verifique se `JWT_SECRET` é o mesmo no `.env` e na Vercel

### Upload de documento falha
- Verifique se o bucket `documentos` existe no Supabase Storage
- Verifique se o bucket é **público**
- Verifique se a política de acesso permite INSERT para `anon`
- Arquivo máximo: 10MB, formatos aceitos: PDF, PNG, JPG

### Google Forms não cria lead
- Verifique se o gatilho `onFormSubmit` está ativo no Apps Script
- Verifique se os nomes das perguntas estão **exatamente** iguais
- Teste com a função `testeManual` no Apps Script
- Verifique o **Registro de Execução** no Apps Script para ver erros

### Dashboard não carrega
- Verifique se a function `get_dashboard_stats()` foi criada no Supabase
- Execute: `GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO anon, authenticated;`

### Erro "Cannot read properties of undefined"
- Provavelmente uma tabela não foi criada — execute o schema completo novamente

---

## 📋 Requisitos para Configuração Completa

Checklist de tudo que precisa ser feito para o sistema funcionar:

- [ ] Criar projeto no Supabase (região São Paulo)
- [ ] Executar `supabase-schema.sql` no SQL Editor
- [ ] Criar bucket `documentos` no Storage (público)
- [ ] Configurar política de acesso no bucket
- [ ] Importar repositório na Vercel
- [ ] Adicionar 4 variáveis de ambiente na Vercel (SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET, CRM_PASSWORD)
- [ ] Redeploy na Vercel após adicionar variáveis
- [ ] Criar Google Forms com os campos corretos
- [ ] Adicionar Apps Script com o código do webhook
- [ ] Criar gatilho `onFormSubmit` no Apps Script
- [ ] Testar login no CRM
- [ ] Testar formulário (função testeManual + envio real)
- [ ] Testar upload de documento

---

**Desenvolvido para AM Consultoria** | CRM Limpa Nome v2.0 | 2026