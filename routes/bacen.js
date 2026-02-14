const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/bacen?cliente_id=X - Listar apontamentos BACEN
router.get('/', async (req, res) => {
  try {
    const { cliente_id, tipo, status } = req.query;

    let query = supabase
      .from('apontamentos_bacen')
      .select('*')
      .order('data_consulta', { ascending: false });

    if (cliente_id) query = query.eq('cliente_id', cliente_id);
    if (tipo) query = query.eq('tipo', tipo);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Erro ao listar apontamentos BACEN:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bacen/:id - Detalhes do apontamento
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('apontamentos_bacen')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Apontamento não encontrado' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar apontamento:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bacen - Cadastrar apontamento
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, tipo, instituicao, valor,
      data_ocorrencia, data_consulta, status, observacoes
    } = req.body;

    if (!cliente_id || !tipo) {
      return res.status(400).json({ error: 'cliente_id e tipo são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('apontamentos_bacen')
      .insert({
        cliente_id, tipo, instituicao,
        valor: valor || null,
        data_ocorrencia: data_ocorrencia || null,
        data_consulta: data_consulta || new Date().toISOString(),
        status: status || 'ativo',
        observacoes
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id,
      tipo: 'bacen',
      descricao: `Apontamento BACEN (${tipo}) cadastrado - ${instituicao || 'N/A'}`,
      usuario: 'sistema'
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar apontamento:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bacen/:id - Atualizar apontamento
router.put('/:id', async (req, res) => {
  try {
    const campos = { ...req.body };
    delete campos.id;
    delete campos.cliente_id;

    const { data, error } = await supabase
      .from('apontamentos_bacen')
      .update(campos)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Apontamento não encontrado' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar apontamento:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bacen/:id - Excluir apontamento
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('apontamentos_bacen')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Apontamento excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir apontamento:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
