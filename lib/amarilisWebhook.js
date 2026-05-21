const supabase = require('./supabase');

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeCpf(value) {
  const cpf = onlyDigits(value);
  return cpf.length === 11 ? cpf : null;
}

function normalizePhone(value) {
  const phone = onlyDigits(value);
  if (!phone) return null;
  return phone.startsWith('55') ? phone : `55${phone}`;
}

function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const cleaned = String(value)
    .trim()
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return null;
}

function parseIncomingPayload(payload) {
  const collected = payload.collected_data || {};
  const contact = payload.contact || {};
  const qualification = payload.qualification || {};
  const interaction = payload.interaction || {};
  const handoff = payload.handoff || {};
  const leadData = payload.lead_data || {};

  const nome = firstNonEmpty(
    contact.nome,
    collected.nome_cliente,
    leadData.nome,
    payload.nome_cliente,
    payload.nome
  );

  const cpf = normalizeCpf(firstNonEmpty(
    contact.cpf,
    collected.cpf,
    leadData.cpf,
    payload.cpf
  ));

  const telefone = normalizePhone(firstNonEmpty(
    contact.telefone,
    collected.telefone,
    leadData.telefone,
    payload.telefone,
    payload.phone
  ));

  const credor = firstNonEmpty(
    qualification.credor,
    collected.credor,
    leadData.credor,
    payload.credor
  );

  const bureau = firstNonEmpty(
    qualification.bureau,
    collected.bureau,
    leadData.bureau,
    payload.bureau
  );

  const interesse = firstNonEmpty(
    qualification.interesse,
    collected.interesse,
    leadData.interesse,
    payload.interesse
  );

  const valorDivida = normalizeMoney(firstNonEmpty(
    qualification.valor_divida,
    collected.valor_divida,
    leadData.valor_divida,
    payload.valor_divida
  ));

  const transcript = firstNonEmpty(interaction.transcript, payload.transcript);
  const summary = firstNonEmpty(interaction.summary, payload.summary, handoff.summary);
  const canal = firstNonEmpty(payload.channel, payload.canal, 'whatsapp');
  const origem = canal === 'voice' ? 'amarilis_voice' : 'amarilis_whatsapp';
  const servico = firstNonEmpty(qualification.servico, payload.servico, 'limpa_nome');
  const crmStatus = firstNonEmpty(
    handoff.crm_status,
    payload.crm_status,
    handoff.needs_human || payload.needs_human ? 'em_atendimento' : 'lead'
  );

  return {
    raw: payload,
    agentId: firstNonEmpty(payload.agent_id, payload.agentId, 'sofia'),
    callId: firstNonEmpty(payload.call_id, payload.message_id, payload.callId),
    source: firstNonEmpty(payload.source, origem),
    channel: canal,
    nome: nome || (telefone ? `Lead Amarilis ${telefone}` : 'Lead Amarilis'),
    cpf,
    telefone,
    credor,
    bureau,
    interesse,
    valorDivida,
    transcript,
    summary,
    servico,
    crmStatus,
    needsHuman: Boolean(handoff.needs_human ?? payload.needs_human ?? false),
    humanReason: firstNonEmpty(handoff.reason, payload.human_reason),
    taskPriority: firstNonEmpty(handoff.task_priority, payload.task_priority, 'alta')
  };
}

async function findCliente({ cpf, telefone }) {
  if (cpf) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cpf', cpf)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (telefone) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

function buildObservacoes(normalized) {
  const parts = [];
  if (normalized.summary) parts.push(normalized.summary);
  if (normalized.interesse) parts.push(`Interesse: ${normalized.interesse}`);
  if (normalized.channel) parts.push(`Canal: ${normalized.channel}`);
  return parts.join(' | ') || null;
}

async function createOrUpdateCliente(normalized) {
  const existente = await findCliente(normalized);
  const observacoes = buildObservacoes(normalized);

  if (!existente) {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: normalized.nome,
        cpf: normalized.cpf || `AMARILIS${Date.now()}`,
        telefone: normalized.telefone || `${Date.now()}`,
        servico_contratado: normalized.servico,
        origem: normalized.source,
        status: normalized.crmStatus,
        observacoes
      })
      .select('*')
      .single();

    if (error) throw error;
    return { cliente: data, created: true };
  }

  const updates = {};

  if ((!existente.cpf || existente.cpf.startsWith('WPP') || existente.cpf.startsWith('AMARILIS')) && normalized.cpf) {
    updates.cpf = normalized.cpf;
  }
  if (!existente.telefone && normalized.telefone) updates.telefone = normalized.telefone;
  if (!existente.servico_contratado && normalized.servico) updates.servico_contratado = normalized.servico;
  if (!existente.origem && normalized.source) updates.origem = normalized.source;
  if (normalized.needsHuman && existente.status !== 'em_atendimento') {
    updates.status = 'em_atendimento';
  } else if (!existente.status && normalized.crmStatus) {
    updates.status = normalized.crmStatus;
  }
  if (observacoes && (!existente.observacoes || !existente.observacoes.includes(observacoes))) {
    updates.observacoes = existente.observacoes
      ? `${existente.observacoes}\n${observacoes}`.trim()
      : observacoes;
  }

  if (!Object.keys(updates).length) {
    return { cliente: existente, created: false };
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', existente.id)
    .select('*')
    .single();

  if (error) throw error;
  return { cliente: data, created: false };
}

async function ensureDivida(clienteId, normalized) {
  if (!normalized.credor && !normalized.bureau && normalized.valorDivida === null) {
    return null;
  }

  let query = supabase
    .from('dividas')
    .select('id')
    .eq('cliente_id', clienteId)
    .limit(1);

  if (normalized.credor) query = query.eq('credor', normalized.credor);
  if (normalized.bureau) query = query.eq('bureau', normalized.bureau);
  if (normalized.valorDivida !== null) query = query.eq('valor_original', normalized.valorDivida);

  const { data: existente, error: searchError } = await query.maybeSingle();
  if (searchError) throw searchError;
  if (existente) return existente;

  const { data, error } = await supabase
    .from('dividas')
    .insert({
      cliente_id: clienteId,
      credor: normalized.credor || 'Credor nao informado',
      valor_original: normalized.valorDivida,
      bureau: normalized.bureau,
      tipo: normalized.servico,
      observacoes: normalized.interesse ? `interesse: ${normalized.interesse}` : null
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function insertHistorico(clienteId, normalized, created) {
  const descricao = normalized.summary
    || (created
      ? `Lead Amarilis criado via ${normalized.channel}`
      : `Novo atendimento Amarilis registrado via ${normalized.channel}`);

  const { error } = await supabase
    .from('historico')
    .insert({
      cliente_id: clienteId,
      tipo: 'amarilis_atendimento',
      descricao,
      usuario: 'webhook-amarilis',
      dados_extra: {
        agent_id: normalized.agentId,
        call_id: normalized.callId,
        channel: normalized.channel,
        source: normalized.source,
        interesse: normalized.interesse,
        transcript: normalized.transcript,
        payload: normalized.raw
      }
    });

  if (error) throw error;
}

async function maybeCreateTask(clienteId, clienteNome, normalized) {
  if (!normalized.needsHuman) return null;

  const { data, error } = await supabase
    .from('tarefas')
    .insert({
      cliente_id: clienteId,
      titulo: `Retornar lead Amarilis: ${clienteNome}`,
      descricao: normalized.summary || `Lead Amarilis escalado para humano. Motivo: ${normalized.humanReason || 'nao_informado'}`,
      tipo: 'contato',
      prioridade: normalized.taskPriority,
      status: 'pendente',
      data_vencimento: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

function authorizeRequest(req) {
  const expectedToken = process.env.AMARILIS_WEBHOOK_TOKEN;
  if (!expectedToken) return true;

  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const direct = req.headers['x-amarilis-token'];
  return bearer === expectedToken || direct === expectedToken;
}

async function processAmarilisWebhook(payload) {
  const normalized = parseIncomingPayload(payload);

  if (!normalized.telefone && !normalized.cpf) {
    const error = new Error('telefone ou cpf sao obrigatorios para identificar o lead');
    error.statusCode = 400;
    throw error;
  }

  const { cliente, created } = await createOrUpdateCliente(normalized);
  const divida = await ensureDivida(cliente.id, normalized);
  await insertHistorico(cliente.id, normalized, created);
  const tarefa = await maybeCreateTask(cliente.id, cliente.nome, normalized);

  return { cliente, created, divida, tarefa, normalized };
}

module.exports = {
  authorizeRequest,
  processAmarilisWebhook
};
