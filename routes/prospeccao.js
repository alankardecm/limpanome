const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// =============================================
// MÓDULO DE PROSPECÇÃO — Alertas, Funil, Extrator
// =============================================

// GET /api/prospeccao/alertas — Leads que precisam de atenção
router.get('/alertas', async (req, res) => {
    try {
        const { data: clientes, error } = await supabase
            .from('clientes')
            .select('id, nome, telefone, cpf, status, origem, data_cadastro, data_atualizacao')
            .order('data_cadastro', { ascending: false });

        if (error) throw error;

        const agora = new Date();
        const alertas = [];

        for (const c of clientes) {
            const cadastro = new Date(c.data_cadastro);
            const updated = new Date(c.data_atualizacao || c.data_cadastro);
            const diasCadastro = Math.floor((agora - cadastro) / (1000 * 60 * 60 * 24));
            const diasSemAtualizar = Math.floor((agora - updated) / (1000 * 60 * 60 * 24));

            let alerta = null;

            if (c.status === 'lead' && diasCadastro > 7) {
                alerta = { tipo: 'frio', nivel: 'vermelho', msg: `Lead há ${diasCadastro} dias sem contato`, acao: 'Entrar em contato ou marcar como perdido' };
            } else if (c.status === 'lead' && diasCadastro > 3) {
                alerta = { tipo: 'esquecido', nivel: 'amarelo', msg: `Lead há ${diasCadastro} dias`, acao: 'Fazer contato imediato' };
            } else if ((c.status === 'em_atendimento' || c.status === 'contato_inicial') && diasSemAtualizar > 3) {
                alerta = { tipo: 'parado', nivel: 'amarelo', msg: `Em atendimento mas sem atualização há ${diasSemAtualizar} dias`, acao: 'Atualizar status ou cobrar retorno' };
            } else if (c.status === 'aguardando_documentos' && diasSemAtualizar > 5) {
                alerta = { tipo: 'docs_pendentes', nivel: 'vermelho', msg: `Aguardando documentos há ${diasSemAtualizar} dias`, acao: 'Cobrar envio dos documentos' };
            } else if (c.status === 'em_analise' && diasSemAtualizar > 15) {
                alerta = { tipo: 'processo_lento', nivel: 'vermelho', msg: `Em análise há ${diasSemAtualizar} dias`, acao: 'Verificar andamento do processo judicial' };
            }

            if (alerta) {
                alertas.push({ ...c, alerta });
            }
        }

        // Ordenar: vermelhos primeiro
        alertas.sort((a, b) => {
            const ordem = { vermelho: 0, amarelo: 1, verde: 2 };
            return (ordem[a.alerta.nivel] || 2) - (ordem[b.alerta.nivel] || 2);
        });

        res.json({ alertas, total: alertas.length });
    } catch (err) {
        console.error('Erro alertas:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/prospeccao/funil — Dados do funil por etapa
router.get('/funil', async (req, res) => {
    try {
        const { data: clientes, error } = await supabase
            .from('clientes')
            .select('id, status, origem, data_cadastro');

        if (error) throw error;

        const agora = new Date();
        const seteDias = new Date(agora - 7 * 24 * 60 * 60 * 1000);
        const trintaDias = new Date(agora - 30 * 24 * 60 * 60 * 1000);

        const funil = {
            lead: 0,
            contato: 0,
            negociacao: 0,
            cliente: 0,
            perdido: 0
        };

        const origens = {};
        let novos7d = 0;
        let novos30d = 0;

        for (const c of clientes) {
            // Funil
            if (c.status === 'lead') funil.lead++;
            else if (['em_atendimento', 'contato_inicial'].includes(c.status)) funil.contato++;
            else if (['aguardando_documentos', 'em_analise'].includes(c.status)) funil.negociacao++;
            else if (['ativo', 'concluido'].includes(c.status)) funil.cliente++;
            else if (['cancelado', 'desistente'].includes(c.status)) funil.perdido++;

            // Origens
            const o = c.origem || 'manual';
            origens[o] = (origens[o] || 0) + 1;

            // Novos
            const dt = new Date(c.data_cadastro);
            if (dt >= seteDias) novos7d++;
            if (dt >= trintaDias) novos30d++;
        }

        const total = clientes.length;
        const taxa = total > 0 ? ((funil.cliente / total) * 100).toFixed(1) : '0.0';

        res.json({ funil, origens, total, novos7d, novos30d, taxaConversao: parseFloat(taxa) });
    } catch (err) {
        console.error('Erro funil:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/prospeccao/prazos — Clientes com prazos próximos de vencimento
router.get('/prazos', async (req, res) => {
    try {
        const { data: tarefas, error } = await supabase
            .from('tarefas')
            .select('*, clientes(nome, telefone)')
            .eq('status', 'pendente')
            .order('data_vencimento', { ascending: true })
            .limit(20);

        if (error) throw error;

        const agora = new Date();
        const resultado = (tarefas || []).map(t => {
            const vencimento = new Date(t.data_vencimento);
            const diasRestantes = Math.ceil((vencimento - agora) / (1000 * 60 * 60 * 24));
            let nivel = 'verde';
            if (diasRestantes < 0) nivel = 'vermelho';
            else if (diasRestantes <= 2) nivel = 'amarelo';
            return { ...t, diasRestantes, nivel };
        });

        res.json({ tarefas: resultado });
    } catch (err) {
        console.error('Erro prazos:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/prospeccao/buscar-maps — Busca no Google Places API
router.post('/buscar-maps', async (req, res) => {
    try {
        const { query, cidade } = req.body;
        if (!query) return res.status(400).json({ error: 'Query é obrigatória' });

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            return res.status(400).json({ error: 'GOOGLE_PLACES_API_KEY não configurada. Adicione nas variáveis de ambiente.' });
        }

        const searchQuery = cidade ? `${query} ${cidade}` : query;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=pt-BR`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            return res.status(400).json({ error: `Google API error: ${data.status}`, details: data.error_message });
        }

        const resultados = (data.results || []).map(r => ({
            nome: r.name,
            endereco: r.formatted_address,
            rating: r.rating || null,
            total_avaliacoes: r.user_ratings_total || 0,
            tipos: r.types || [],
            place_id: r.place_id,
            lat: r.geometry?.location?.lat,
            lng: r.geometry?.location?.lng
        }));

        res.json({ resultados, total: resultados.length });
    } catch (err) {
        console.error('Erro buscar-maps:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/prospeccao/detalhe-maps — Pega telefone e website de um lugar
router.post('/detalhe-maps', async (req, res) => {
    try {
        const { place_id } = req.body;
        if (!place_id) return res.status(400).json({ error: 'place_id é obrigatório' });

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) return res.status(400).json({ error: 'GOOGLE_PLACES_API_KEY não configurada' });

        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_phone_number,international_phone_number,website,url&key=${apiKey}&language=pt-BR`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            return res.status(400).json({ error: `Google API error: ${data.status}` });
        }

        res.json({
            nome: data.result.name,
            telefone: data.result.formatted_phone_number || null,
            telefone_intl: data.result.international_phone_number || null,
            website: data.result.website || null,
            maps_url: data.result.url || null
        });
    } catch (err) {
        console.error('Erro detalhe-maps:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/prospeccao/salvar-leads — Salva contatos extraídos como leads
router.post('/salvar-leads', async (req, res) => {
    try {
        const { contatos } = req.body;
        if (!contatos || !Array.isArray(contatos) || contatos.length === 0) {
            return res.status(400).json({ error: 'Lista de contatos vazia' });
        }

        const resultados = [];

        for (const contato of contatos) {
            const telefone = (contato.telefone || '').replace(/\D/g, '');
            if (!contato.nome) continue;

            // Verificar duplicidade
            let existente = null;
            if (telefone) {
                const { data } = await supabase
                    .from('clientes')
                    .select('id')
                    .eq('telefone', telefone)
                    .maybeSingle();
                existente = data;
            }

            if (existente) {
                resultados.push({ nome: contato.nome, status: 'duplicado', id: existente.id });
                continue;
            }

            // Criar lead
            const { data: novo, error } = await supabase
                .from('clientes')
                .insert({
                    nome: contato.nome,
                    telefone: telefone || null,
                    email: contato.email || null,
                    cidade: contato.cidade || null,
                    endereco: contato.endereco || null,
                    origem: 'google_maps',
                    status: 'lead',
                    observacoes: contato.observacoes || `Extraído do Google Maps`
                })
                .select('id')
                .single();

            if (error) {
                resultados.push({ nome: contato.nome, status: 'erro', erro: error.message });
            } else {
                // Criar tarefa de contato
                await supabase.from('tarefas').insert({
                    cliente_id: novo.id,
                    titulo: `Contatar lead extraído: ${contato.nome}`,
                    descricao: `Lead extraído do Google Maps. Endereço: ${contato.endereco || 'N/A'}`,
                    prioridade: 'media',
                    status: 'pendente',
                    data_vencimento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

                resultados.push({ nome: contato.nome, status: 'criado', id: novo.id });
            }
        }

        const criados = resultados.filter(r => r.status === 'criado').length;
        const duplicados = resultados.filter(r => r.status === 'duplicado').length;

        res.json({ resultados, criados, duplicados, total: contatos.length });
    } catch (err) {
        console.error('Erro salvar-leads:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
