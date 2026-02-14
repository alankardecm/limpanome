const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/dividas?cliente_id=X - Listar dívidas de um cliente
router.get('/', async (req, res) => {
  try {
    const { cliente_id, bureau, status } = req.query;

    let query = supabase
      .from('dividas')
      .select('*')
      .order('data_cadastro', { ascending: false });

    if (cliente_id) query = query.eq('cliente_id', cliente_id);
    if (bureau) query = query.eq('bureau', bureau);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Erro ao listar dívidas:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dividas/:id - Detalhes de uma dívida
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dividas')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Dívida não encontrada' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar dívida:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dividas - Cadastrar dívida
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, credor, bureau, contrato,
      valor_original, valor_atualizado,
      data_vencimento, tipo, status, observacoes
    } = req.body;

    if (!cliente_id || !credor) {
      return res.status(400).json({ error: 'cliente_id e credor são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('dividas')
      .insert({
        cliente_id, credor, bureau, contrato,
        valor_original: valor_original || 0,
        valor_atualizado: valor_atualizado || null,
        data_vencimento: data_vencimento || null,
        tipo: tipo || 'outros',
        status: status || 'ativa',
        observacoes
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id,
      tipo: 'divida',
      descricao: `Dívida cadastrada: ${credor} - R$ ${(valor_original || 0).toFixed(2)} (${bureau || 'N/A'})`,
      usuario: 'sistema'
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar dívida:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dividas/:id - Atualizar dívida
router.put('/:id', async (req, res) => {
  try {
    const campos = { ...req.body };
    delete campos.id;
    delete campos.cliente_id;
    delete campos.data_cadastro;

    const { data, error } = await supabase
      .from('dividas')
      .update(campos)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Dívida não encontrada' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar dívida:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dividas/:id - Excluir dívida
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('dividas')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Dívida excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir dívida:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
