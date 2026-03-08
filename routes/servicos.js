const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

const TIPOS_VALIDOS = ['limpa_nome_cpf', 'limpa_nome_cnpj', 'rating_cpf', 'rating_cnpj', 'score', 'bacen'];
const STATUS_VALIDOS = ['em_andamento', 'concluido', 'cancelado'];

// GET /api/servicos?cliente_id=X
router.get('/', async (req, res) => {
    try {
        const { cliente_id } = req.query;
        if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório' });

        const { data, error } = await supabase
            .from('servicos_cliente')
            .select('*')
            .eq('cliente_id', cliente_id)
            .order('criado_em', { ascending: true });

        if (error) throw error;
        res.json({ data: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/servicos
router.post('/', async (req, res) => {
    try {
        const { cliente_id, tipo, descricao, data_inicio, observacoes } = req.body;
        if (!cliente_id || !tipo) return res.status(400).json({ error: 'cliente_id e tipo são obrigatórios' });
        if (!TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de serviço inválido' });

        const { data, error } = await supabase
            .from('servicos_cliente')
            .insert({ cliente_id, tipo, descricao, data_inicio: data_inicio || null, observacoes, status: 'em_andamento' })
            .select()
            .single();

        if (error) throw error;

        // Registrar no histórico
        await supabase.from('historico').insert({
            cliente_id,
            tipo: 'cadastro',
            descricao: `Serviço adicionado: ${tipo.replace(/_/g, ' ').toUpperCase()}`,
            usuario: req.user?.email || 'sistema'
        });

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/servicos/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, descricao, observacoes, data_inicio } = req.body;

        if (status && !STATUS_VALIDOS.includes(status)) return res.status(400).json({ error: 'Status inválido' });

        const updates = { atualizado_em: new Date().toISOString() };
        if (status !== undefined) {
            updates.status = status;
            if (status === 'concluido') updates.data_conclusao = new Date().toISOString().split('T')[0];
            if (status === 'em_andamento') updates.data_conclusao = null;
        }
        if (descricao !== undefined) updates.descricao = descricao;
        if (observacoes !== undefined) updates.observacoes = observacoes;
        if (data_inicio !== undefined) updates.data_inicio = data_inicio;

        const { data, error } = await supabase
            .from('servicos_cliente')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Registrar no histórico
        if (status) {
            await supabase.from('historico').insert({
                cliente_id: data.cliente_id,
                tipo: 'atualizacao',
                descricao: `Serviço ${data.tipo.replace(/_/g, ' ').toUpperCase()} → ${status.replace('_', ' ')}`,
                usuario: req.user?.email || 'sistema'
            });
        }

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/servicos/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('servicos_cliente').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
