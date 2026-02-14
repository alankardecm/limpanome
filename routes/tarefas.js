const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/tarefas - Listar tarefas com filtros
router.get('/', async (req, res) => {
  try {
    const { cliente_id, status, prioridade, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('tarefas')
      .select('*, clientes(nome)', { count: 'exact' });

    if (cliente_id) query = query.eq('cliente_id', cliente_id);
    if (status) query = query.eq('status', status);
    if (prioridade) query = query.eq('prioridade', prioridade);

    // Ordenação: urgente primeiro, depois por data de vencimento
    const { data, count, error } = await query
      .order('prioridade', { ascending: true })  // urgente vem primeiro alfabeticamente
      .order('data_vencimento', { ascending: true, nullsFirst: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    // Mapear para incluir cliente_nome no nível raiz
    const tarefas = (data || []).map(t => ({
      ...t,
      cliente_nome: t.clientes?.nome || null,
      clientes: undefined
    }));

    res.json({
      data: tarefas,
      pagination: {
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (err) {
    console.error('Erro ao listar tarefas:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tarefas/:id - Detalhes da tarefa
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*, clientes(nome)')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Tarefa não encontrada' });
      throw error;
    }

    res.json({
      ...data,
      cliente_nome: data.clientes?.nome || null,
      clientes: undefined
    });
  } catch (err) {
    console.error('Erro ao buscar tarefa:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tarefas - Criar tarefa
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, titulo, descricao, tipo,
      prioridade, status, data_vencimento, responsavel
    } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        cliente_id: cliente_id || null,
        titulo, descricao,
        tipo: tipo || 'geral',
        prioridade: prioridade || 'normal',
        status: status || 'pendente',
        data_vencimento: data_vencimento || null,
        responsavel
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico se vinculada a um cliente
    if (cliente_id) {
      await supabase.from('historico').insert({
        cliente_id,
        tipo: 'tarefa',
        descricao: `Tarefa criada: ${titulo}`,
        usuario: 'sistema'
      });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tarefas/:id - Atualizar tarefa
router.put('/:id', async (req, res) => {
  try {
    const campos = { ...req.body };
    delete campos.id;
    delete campos.data_criacao;
    delete campos.cliente_nome;
    delete campos.clientes;

    // Auto-preencher data_conclusao
    if (campos.status === 'concluida' && !campos.data_conclusao) {
      campos.data_conclusao = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tarefas')
      .update(campos)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Tarefa não encontrada' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar tarefa:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tarefas/:id - Excluir tarefa
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir tarefa:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
