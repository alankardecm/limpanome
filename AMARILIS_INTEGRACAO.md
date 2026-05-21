# Integracao Amarilis no CRM Limpa Nome

## Objetivo

Documentar a implantacao do modulo Amarilis dentro do projeto `05 - LIMPA NOME` sem alterar o que ja funciona em producao.

Premissa obrigatoria:

- nao remover rotas existentes
- nao substituir fluxos existentes
- nao alterar comportamento do CRM operacional atual
- implantar apenas componentes novos e isolados

## Estrategia adotada

O projeto Amarilis foi centralizado dentro do CRM principal como uma integracao paralela.

Isso significa:

- `14 - PROJ ATENDIMENTO AMARILIS` continua como pasta de blueprint, fluxo e contratos
- `05 - LIMPA NOME` e a base real de implementacao
- o CRM atual continua atendendo os fluxos ja ativos
- Amarilis entra por uma rota nova dedicada

## O que foi implantado

### Nova rota publica

Endpoint novo:

- `POST /api/webhook/amarilis`

Arquivo de registro da rota:

- `app.js`
- `routes/amarilis-webhook.js`

Objetivo da rota:

- receber payloads do fluxo Amarilis
- normalizar os dados
- localizar ou criar cliente
- registrar historico
- criar divida quando aplicavel
- criar tarefa quando houver escalacao para humano

### Nova camada de servico isolada

Arquivo:

- `lib/amarilisWebhook.js`

Responsabilidades:

- normalizar CPF, telefone e valor de divida
- aceitar payload canonico e variacoes do blueprint Amarilis
- deduplicar por CPF
- se nao houver CPF valido, deduplicar por telefone
- criar cliente novo apenas quando necessario
- atualizar cliente existente de forma conservadora
- evitar sobrescrita agressiva de dados ja cadastrados
- anexar historico tecnico do atendimento
- criar tarefa apenas quando `needs_human = true`

## Garantias de nao regressao

As rotas abaixo nao foram removidas nem substituidas:

- `POST /api/webhook/forms`
- `POST /api/webhook/whatsapp`
- `POST /api/webhook/generic`
- `POST /api/ia-sdr/webhook`
- rotas autenticadas do CRM

O modulo Amarilis foi adicionado como extensao paralela. O comportamento atual do CRM continua sendo o mesmo.

## Fluxo do webhook Amarilis

1. O n8n ou outro integrador envia um `POST` para `/api/webhook/amarilis`.
2. A rota valida token opcional, se configurado.
3. O payload e normalizado para um formato interno.
4. O sistema tenta localizar cliente existente por CPF.
5. Se nao localizar por CPF, tenta por telefone.
6. Se nao existir cliente, cria um novo lead.
7. Se existir cliente, atualiza apenas campos faltantes ou seguros.
8. Se houver dados de divida, registra em `dividas`.
9. Registra evento em `historico` com `tipo = amarilis_atendimento`.
10. Se `needs_human = true`, cria tarefa comercial em `tarefas`.

## Payloads aceitos

### Formato canonico recomendado

```json
{
  "source": "amarilis_whatsapp",
  "agent_id": "sofia_wpp_v1",
  "channel": "whatsapp",
  "message_id": "wamid.abc",
  "contact": {
    "nome": "Joao Silva",
    "telefone": "5519999999999",
    "cpf": "12345678900"
  },
  "qualification": {
    "bureau": "serasa",
    "credor": "Banco do Brasil",
    "valor_divida": 8000,
    "interesse": "alto",
    "servico": "limpa_nome"
  },
  "interaction": {
    "lead_message": "Quero saber como funciona",
    "agent_response": "Posso te explicar rapidinho.",
    "response_mode": "audio",
    "transcript": "texto consolidado da conversa",
    "summary": "Lead pediu explicacao e mostrou interesse."
  },
  "handoff": {
    "needs_human": true,
    "reason": "lead_qualificado",
    "task_priority": "urgente",
    "crm_status": "em_atendimento"
  }
}
```

### Formatos tambem aceitos

A implementacao tambem aceita campos vindos do blueprint antigo, como:

- `collected_data.nome_cliente`
- `collected_data.cpf`
- `collected_data.telefone`
- `collected_data.bureau`
- `collected_data.valor_divida`
- `collected_data.credor`
- `collected_data.interesse`
- `transcript`

## Regras de deduplicacao

- se houver CPF valido, o cliente e buscado por CPF
- se nao houver CPF valido, o cliente e buscado por telefone
- se o cliente ja existir, o sistema evita criar outro cadastro
- atualizacoes em cliente existente sao conservadoras

## Regras de escrita no CRM

### clientes

Campos usados:

- `nome`
- `cpf`
- `telefone`
- `servico_contratado`
- `origem`
- `status`
- `observacoes`

Origem esperada:

- `amarilis_whatsapp`
- `amarilis_voice`

### dividas

Criada quando houver ao menos um destes dados:

- `credor`
- `bureau`
- `valor_divida`

Campos usados:

- `cliente_id`
- `credor`
- `valor_original`
- `bureau`
- `tipo`
- `observacoes`

### historico

Sempre registra:

- `tipo = amarilis_atendimento`
- `usuario = webhook-amarilis`
- `dados_extra` com payload bruto, transcript, canal e identificadores

### tarefas

Criada apenas quando:

- `needs_human = true`

Campos usados:

- `cliente_id`
- `titulo`
- `descricao`
- `tipo = contato`
- `prioridade`
- `status = pendente`

## Seguranca

O webhook aceita token opcional por variavel de ambiente:

- `AMARILIS_WEBHOOK_TOKEN`

Quando configurada, a requisicao precisa enviar um destes cabecalhos:

- `Authorization: Bearer SEU_TOKEN`
- `x-amarilis-token: SEU_TOKEN`

Se a variavel nao estiver configurada, a rota continua publica.

## Arquivos envolvidos

- `app.js`
- `routes/amarilis-webhook.js`
- `lib/amarilisWebhook.js`

## Decisao arquitetural

O modulo Amarilis foi implantado como extensao do CRM e nao como substituicao.

Decisao final:

- manter o CRM atual intocado
- encaixar Amarilis como modulo paralelo
- isolar a entrada em webhook proprio
- reaproveitar tabelas existentes `clientes`, `dividas`, `historico` e `tarefas`

## Pendencias recomendadas

1. Testar o endpoint com payload real do n8n.
2. Definir se `AMARILIS_WEBHOOK_TOKEN` sera obrigatorio em producao.
3. Ajustar o workflow do n8n para apontar para `/api/webhook/amarilis`.
4. Revisar se sera necessario enviar notificacao interna via WhatsApp para escalacoes Amarilis.
5. Atualizar o plano externo do projeto Amarilis para refletir a entrada direta no CRM.
