const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/historico?cliente_id=X - Listar histórico
router.get('/', async (req, res) => {
  try {
    const { cliente_id, tipo, limit = 50 } = req.query;

    let query = supabase
      .from('historico')
      .select('*')
      .order('data_registro', { ascending: false })
      .limit(parseInt(limit));

    if (cliente_id) query = query.eq('cliente_id', cliente_id);
    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Erro ao listar histórico:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/historico - Adicionar entrada no histórico
router.post('/', async (req, res) => {
  try {
    const { cliente_id, tipo, descricao, usuario, dados_extra } = req.body;

    if (!cliente_id || !tipo || !descricao) {
      return res.status(400).json({ error: 'cliente_id, tipo e descricao são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('historico')
      .insert({
        cliente_id,
        tipo,
        descricao,
        usuario: usuario || 'sistema',
        dados_extra: dados_extra || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar histórico:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/historico/:id - Excluir entrada
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('historico')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Registro excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir histórico:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
