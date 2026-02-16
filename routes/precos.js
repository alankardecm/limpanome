const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/precos - Listar todos os serviços e preços
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tabela_precos')
            .select('*')
            .order('ordem', { ascending: true })
            .order('servico', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Erro ao listar preços:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/precos - Criar novo serviço
router.post('/', async (req, res) => {
    try {
        const { servico, preco_tabela, preco_meekah, preco_geral, ordem } = req.body;

        if (!servico) {
            return res.status(400).json({ error: 'Nome do serviço é obrigatório' });
        }

        const { data, error } = await supabase
            .from('tabela_precos')
            .insert({
                servico,
                preco_tabela: preco_tabela || null,
                preco_meekah: preco_meekah || null,
                preco_geral: preco_geral || null,
                ordem: ordem || 0
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Erro ao criar preço:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/precos/:id - Atualizar preço
router.put('/:id', async (req, res) => {
    try {
        const campos = { ...req.body, data_atualizacao: new Date().toISOString() };
        delete campos.id;

        const { data, error } = await supabase
            .from('tabela_precos')
            .update(campos)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Erro ao atualizar preço:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/precos/:id - Excluir serviço
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('tabela_precos')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Serviço excluído com sucesso' });
    } catch (err) {
        console.error('Erro ao excluir preço:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
