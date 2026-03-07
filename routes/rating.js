const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// POST /api/rating/submit — PÚBLICO (sem auth) — cliente envia o formulário preenchido
router.post('/submit', async (req, res) => {
    try {
        const {
            cliente_id,
            // Pessoa Física
            titulo_eleitor, rg, data_expedicao, estado_civil,
            conjuge_nome, conjuge_cpf, conjuge_rg,
            nome_pai, nome_mae,
            endereco, numero, cep, bairro, cidade, estado,
            telefone_residencial, empresa, data_admissao,
            salario, renda_familiar, faturamento,
            // Arrays
            bancos, referencias, logins, documentos_checklist
        } = req.body;

        if (!cliente_id) {
            return res.status(400).json({ error: 'cliente_id é obrigatório' });
        }

        // Verifica se já existe uma ficha para esse cliente
        const { data: existing } = await supabase
            .from('fichas_rating')
            .select('id')
            .eq('cliente_id', cliente_id)
            .single();

        let result;
        if (existing) {
            // Atualiza
            result = await supabase
                .from('fichas_rating')
                .update({
                    titulo_eleitor, rg, data_expedicao: data_expedicao || null,
                    estado_civil, conjuge_nome, conjuge_cpf, conjuge_rg,
                    nome_pai, nome_mae, endereco, numero, cep, bairro, cidade, estado,
                    telefone_residencial, empresa,
                    data_admissao: data_admissao || null,
                    salario: salario || null, renda_familiar: renda_familiar || null,
                    faturamento: faturamento || null,
                    bancos: bancos || [], referencias: referencias || [],
                    logins: logins || [], documentos_checklist: documentos_checklist || [],
                    atualizado_em: new Date().toISOString()
                })
                .eq('cliente_id', cliente_id)
                .select()
                .single();
        } else {
            // Cria novo
            result = await supabase
                .from('fichas_rating')
                .insert({
                    cliente_id,
                    titulo_eleitor, rg, data_expedicao: data_expedicao || null,
                    estado_civil, conjuge_nome, conjuge_cpf, conjuge_rg,
                    nome_pai, nome_mae, endereco, numero, cep, bairro, cidade, estado,
                    telefone_residencial, empresa,
                    data_admissao: data_admissao || null,
                    salario: salario || null, renda_familiar: renda_familiar || null,
                    faturamento: faturamento || null,
                    bancos: bancos || [], referencias: referencias || [],
                    logins: logins || [], documentos_checklist: documentos_checklist || []
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        // Registra no histórico do cliente
        await supabase.from('historico').insert({
            cliente_id,
            tipo: 'documento',
            descricao: 'Ficha de Rating preenchida pelo cliente via formulário',
            usuario: 'cliente'
        });

        res.json({ success: true, data: result.data });
    } catch (err) {
        console.error('Erro ao salvar rating:', err);
        res.status(500).json({ error: 'Erro ao salvar ficha de rating', details: err.message });
    }
});

// GET /api/rating/:clienteId — PROTEGIDO — CRM busca o rating de um cliente
router.get('/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;

        const { data, error } = await supabase
            .from('fichas_rating')
            .select('*')
            .eq('cliente_id', clienteId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Não encontrado — retorna null sem erro
            return res.json({ data: null });
        }

        if (error) throw error;

        res.json({ data });
    } catch (err) {
        console.error('Erro ao buscar rating:', err);
        res.status(500).json({ error: 'Erro ao buscar ficha de rating', details: err.message });
    }
});

module.exports = router;
