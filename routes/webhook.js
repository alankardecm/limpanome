const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// POST /api/webhook/forms - Google Forms
router.post('/forms', async (req, res) => {
  try {
    const dados = req.body;

    // Mapear campos do Google Forms
    const nome = dados.nome || dados['Nome Completo'] || dados['nome_completo'] || '';
    const cpf = (dados.cpf || dados['CPF'] || '').replace(/\D/g, '');
    const telefone = dados.telefone || dados['Telefone'] || dados['WhatsApp'] || '';
    const email = dados.email || dados['E-mail'] || dados['Email'] || '';

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    // Verificar duplicidade por CPF ou telefone
    let existente = null;
    if (cpf) {
      const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('cpf', cpf)
        .maybeSingle();
      existente = data;
    }

    if (!existente && telefone) {
      const telLimpo = telefone.replace(/\D/g, '');
      const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', telLimpo)
        .maybeSingle();
      existente = data;
    }

    if (existente) {
      // Registrar contato duplicado no histórico
      await supabase.from('historico').insert({
        cliente_id: existente.id,
        tipo: 'contato',
        descricao: 'Novo preenchimento de formulário (Google Forms) - cliente já cadastrado',
        usuario: 'webhook-forms'
      });
      return res.json({ message: 'Cliente já cadastrado', cliente_id: existente.id, duplicado: true });
    }

    // Capturar serviço(s) contratado(s) - pode vir como array (checkbox) ou string
    let servico = dados.servico_contratado || dados['Serviço Contratado'] || dados['servico'] || '';
    if (Array.isArray(servico)) servico = servico.filter(Boolean).join(', ');

    // Criar novo cliente
    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        nome,
        cpf: cpf || null,
        telefone: telefone.replace(/\D/g, ''),
        email: email || null,
        data_nascimento: dados.data_nascimento || null,
        cidade: dados.cidade || dados['Cidade'] || null,
        estado: dados.estado || dados['Estado'] || null,
        renda_mensal: dados.renda_mensal ? parseFloat(dados.renda_mensal) : null,
        servico_contratado: servico || null,
        observacoes: dados.observacoes || dados['Observações'] || null,
        origem: 'google_forms',
        status: 'lead'
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id: cliente.id,
      tipo: 'cadastro',
      descricao: 'Lead captado via Google Forms',
      usuario: 'webhook-forms'
    });

    // Criar tarefa de follow-up
    await supabase.from('tarefas').insert({
      cliente_id: cliente.id,
      titulo: `Contatar lead: ${nome}`,
      descricao: `Novo lead via Google Forms. Telefone: ${telefone}`,
      tipo: 'contato',
      prioridade: 'alta',
      status: 'pendente',
      data_vencimento: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    res.status(201).json({ message: 'Lead cadastrado com sucesso', cliente_id: cliente.id });
  } catch (err) {
    console.error('Erro no webhook Forms:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhook/whatsapp - Z-API / Baileys / Evolution API
router.post('/whatsapp', async (req, res) => {
  try {
    const dados = req.body;

    // Extrair dados conforme diferentes APIs
    const telefone = (
      dados.phone || dados.from || dados.sender ||
      dados.data?.from || dados.data?.key?.remoteJid || ''
    ).replace(/\D/g, '').replace(/^55/, '');

    const nome = dados.pushName || dados.name || dados.senderName ||
      dados.data?.pushName || dados.contact?.name || `WhatsApp ${telefone}`;

    const mensagem = dados.text?.message || dados.message?.conversation ||
      dados.data?.message?.conversation || dados.body || '';

    if (!telefone) {
      return res.status(400).json({ error: 'Telefone não identificado' });
    }

    // Verificar se já existe
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefone', telefone)
      .maybeSingle();

    if (existente) {
      // Registrar contato no histórico
      await supabase.from('historico').insert({
        cliente_id: existente.id,
        tipo: 'contato',
        descricao: `Mensagem WhatsApp: ${mensagem.substring(0, 200) || '(mídia)'}`,
        usuario: 'webhook-whatsapp'
      });
      return res.json({ message: 'Contato registrado', cliente_id: existente.id });
    }

    // Criar novo lead
    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        nome, telefone,
        origem: 'whatsapp',
        status: 'lead',
        observacoes: mensagem ? `Primeira mensagem: ${mensagem.substring(0, 500)}` : null
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id: cliente.id,
      tipo: 'cadastro',
      descricao: `Lead captado via WhatsApp: ${mensagem.substring(0, 200) || '(primeiro contato)'}`,
      usuario: 'webhook-whatsapp'
    });

    // Criar tarefa
    await supabase.from('tarefas').insert({
      cliente_id: cliente.id,
      titulo: `Responder WhatsApp: ${nome}`,
      descricao: `Novo contato via WhatsApp. Telefone: ${telefone}`,
      tipo: 'contato',
      prioridade: 'urgente',
      status: 'pendente',
      data_vencimento: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    });

    res.status(201).json({ message: 'Lead cadastrado via WhatsApp', cliente_id: cliente.id });
  } catch (err) {
    console.error('Erro no webhook WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhook/generic - Webhook genérico
router.post('/generic', async (req, res) => {
  try {
    const dados = req.body;

    const nome = dados.nome || dados.name || '';
    const cpf = (dados.cpf || '').replace(/\D/g, '');
    const telefone = (dados.telefone || dados.phone || '').replace(/\D/g, '');
    const email = dados.email || '';
    const origem = dados.origem || dados.source || 'webhook';

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        nome,
        cpf: cpf || null,
        telefone: telefone || null,
        email: email || null,
        origem,
        status: 'lead',
        observacoes: dados.observacoes || null
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('historico').insert({
      cliente_id: cliente.id,
      tipo: 'cadastro',
      descricao: `Lead captado via webhook (${origem})`,
      usuario: 'webhook-generic'
    });

    res.status(201).json({ message: 'Lead cadastrado', cliente_id: cliente.id });
  } catch (err) {
    console.error('Erro no webhook genérico:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
