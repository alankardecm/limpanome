# CRM Limpa Nome

Sistema CRM completo para gestão de clientes do projeto **Limpa Nome** — liminares, score, apontamentos BACEN e controle de dívidas.

## Funcionalidades

### Dashboard
- Métricas em tempo real: clientes, processos, score médio, dívidas
- Pipeline visual de status dos clientes
- Distribuição de dívidas por bureau (Serasa, SPC, Boa Vista, BACEN)
- Alertas: liminares expirando, tarefas vencidas
- Últimas atividades / timeline

### Gestão de Clientes
- Cadastro completo (dados pessoais, contato, endereço, profissão, renda)
- Busca por nome, CPF, telefone ou e-mail
- Filtros por status e origem
- Detalhe completo com abas: Geral, Dívidas, Processos, BACEN, Score, Histórico, Tarefas
- Pipeline visual (Kanban): Lead → Análise → Em Processo → Concluído → Cancelado

### Controle de Dívidas
- Cadastro por credor, bureau, tipo, valor, data de negativação
- Status: ativa, liminar ativa, baixada, negociando
- Totais automáticos por cliente

### Processos / Liminares
- Cadastro completo: nº processo, advogado, escritório, plataforma parceira
- Bureaus alvo selecionáveis (Serasa, SPC, Boa Vista, BACEN)
- Status: preparando, protocolado, deferido, indeferido, cumprido, arquivado
- Controle de datas: protocolo, deferimento, validade
- Honorários e custas

### Apontamentos BACEN
- Tipos: CCF, PEFIN, REFIN, Outro
- Controle de status: ativo, em processo, removido
- Vinculação com processos

### Score
- Score inicial e atual
- Histórico de evolução do score por bureau
- Indicadores visuais (verde/vermelho)

### Tarefas
- Sistema completo de follow-ups e prazos
- Prioridades: baixa, média, alta, urgente
- Vinculação com cliente
- Alerta de tarefas vencidas

### Webhooks / Integrações
- **POST /api/webhook/forms** — Recebe leads do Google Forms, Typeform, etc.
- **POST /api/webhook/whatsapp** — Recebe leads de WhatsApp (Z-API, Baileys, etc.)
- **POST /api/webhook/generico** — Webhook genérico para qualquer plataforma
- Detecção automática de duplicatas por CPF/telefone
- Registro automático no histórico

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start

# Modo desenvolvimento (auto-reload)
npm run dev
```

O servidor inicia em **http://localhost:3000**

## Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** SQLite (via better-sqlite3) — sem necessidade de servidor externo
- **Frontend:** HTML5 + CSS3 + JavaScript (SPA vanilla)
- **Ícones:** Font Awesome 6

## Estrutura de Arquivos

```
├── server.js               # Servidor Express
├── database.js             # Schema e conexão SQLite
├── package.json
├── routes/
│   ├── clientes.js         # CRUD clientes
│   ├── dividas.js          # CRUD dívidas
│   ├── processos.js        # CRUD processos/liminares
│   ├── bacen.js            # CRUD apontamentos BACEN
│   ├── historico.js        # Timeline/histórico
│   ├── tarefas.js          # CRUD tarefas
│   ├── dashboard.js        # Métricas
│   └── webhook.js          # Webhooks (Forms, WhatsApp)
├── public/
│   ├── index.html          # SPA principal
│   ├── css/style.css       # Design system completo
│   └── js/
│       ├── api.js          # Cliente HTTP
│       ├── utils.js        # Formatadores e helpers
│       ├── components.js   # Componentes reutilizáveis
│       ├── app.js          # Controlador SPA
│       └── pages/          # Páginas
│           ├── dashboard.js
│           ├── clientes.js
│           ├── cliente-detalhe.js
│           ├── processos.js
│           ├── tarefas.js
│           └── pipeline.js
└── data/
    └── crm.db              # Banco SQLite (criado automaticamente)
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/clientes | Listar clientes (com filtros e paginação) |
| GET | /api/clientes/:id | Detalhe completo do cliente |
| POST | /api/clientes | Criar cliente |
| PUT | /api/clientes/:id | Atualizar cliente |
| DELETE | /api/clientes/:id | Excluir cliente |
| GET/POST/PUT/DELETE | /api/dividas | CRUD dívidas |
| GET/POST/PUT/DELETE | /api/processos | CRUD processos |
| GET/POST/PUT/DELETE | /api/bacen | CRUD apontamentos BACEN |
| GET/POST | /api/historico | Histórico/timeline |
| GET/POST/PUT/DELETE | /api/tarefas | CRUD tarefas |
| GET | /api/dashboard | Métricas do dashboard |
| POST | /api/webhook/forms | Webhook Google Forms |
| POST | /api/webhook/whatsapp | Webhook WhatsApp |
| POST | /api/webhook/generico | Webhook genérico |

## Exemplo: Integrar com Google Forms

No Google Forms, use um script Apps Script para enviar dados via webhook:

```javascript
function onFormSubmit(e) {
  var responses = e.response.getItemResponses();
  var data = {};
  responses.forEach(function(r) {
    data[r.getItem().getTitle()] = r.getResponse();
  });
  
  UrlFetchApp.fetch('http://SEU_SERVIDOR:3000/api/webhook/forms', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  });
}
```

## Exemplo: Integrar com WhatsApp (Z-API)

Configure o webhook da Z-API para apontar para:
```
http://SEU_SERVIDOR:3000/api/webhook/whatsapp
```

O sistema aceita os campos: `nome`, `pushName`, `phone`, `from`, `message`, `body`, `cpf`.
