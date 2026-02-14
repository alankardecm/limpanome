const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/processos?cliente_id=X - Listar processos
router.get('/', async (req, res) => {
  try {
    const { cliente_id, status, tipo } = req.query;

    let query = supabase
      .from('processos')
      .select('*')
      .order('data_cadastro', { ascending: false });

    if (cliente_id) query = query.eq('cliente_id', cliente_id);
    if (status) query = query.eq('status', status);
    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Erro ao listar processos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/processos/:id - Detalhes do processo
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('processos')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Processo não encontrado' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar processo:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/processos - Cadastrar processo
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, numero_processo, tipo, vara, comarca,
      status, bureaus_alvo, advogado, data_ajuizamento,
      data_liminar, data_validade, observacoes
    } = req.body;

    if (!cliente_id || !tipo) {
      return res.status(400).json({ error: 'cliente_id e tipo são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('processos')
      .insert({
        cliente_id, numero_processo, tipo, vara, comarca,
        status: status || 'em_andamento',
        bureaus_alvo: bureaus_alvo || null,
        advogado,
        data_ajuizamento: data_ajuizamento || null,
        data_liminar: data_liminar || null,
        data_validade: data_validade || null,
        observacoes
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id,
      tipo: 'processo',
      descricao: `Processo ${tipo} cadastrado${numero_processo ? ': ' + numero_processo : ''}`,
      usuario: 'sistema'
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar processo:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/processos/:id - Atualizar processo
router.put('/:id', async (req, res) => {
  try {
    const campos = { ...req.body };
    const clienteId = campos.cliente_id;
    delete campos.id;
    delete campos.data_cadastro;

    // Se bureaus_alvo vem como array, mantém como JSONB
    if (campos.bureaus_alvo && typeof campos.bureaus_alvo === 'string') {
      try { campos.bureaus_alvo = JSON.parse(campos.bureaus_alvo); } catch(e) {}
    }

    const { data, error } = await supabase
      .from('processos')
      .update(campos)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Processo não encontrado' });
      throw error;
    }

    // Se processo foi marcado como cumprido, atualizar status das dívidas
    if (campos.status === 'cumprido' && data.cliente_id) {
      await supabase
        .from('dividas')
        .update({ status: 'limpa' })
        .eq('cliente_id', data.cliente_id)
        .eq('status', 'ativa');

      await supabase.from('historico').insert({
        cliente_id: data.cliente_id,
        tipo: 'processo',
        descricao: `Liminar cumprida - dívidas marcadas como limpas`,
        usuario: 'sistema'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar processo:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/processos/:id - Excluir processo
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('processos')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Processo excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir processo:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
