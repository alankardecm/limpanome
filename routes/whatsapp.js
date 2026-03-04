const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// =============================================
// MÓDULO WHATSAPP — Disparo em Massa via Meta Cloud API
// =============================================

const META_API = 'https://graph.facebook.com/v19.0';

function getMetaConfig() {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;
    if (!token || !phoneId) throw new Error('META_WHATSAPP_TOKEN ou META_PHONE_NUMBER_ID não configurados');
    return { token, phoneId };
}

function formatarTelefone(tel) {
    const limpo = (tel || '').replace(/\D/g, '');
    if (!limpo) return null;
    return limpo.startsWith('55') ? limpo : `55${limpo}`;
}

async function enviarMensagemMeta(telefone, mensagem, token, phoneId) {
    const tel = formatarTelefone(telefone);
    if (!tel) throw new Error('Telefone inválido');

    const response = await fetch(`${META_API}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: tel,
            type: 'text',
            text: { body: mensagem }
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }
    return data;
}

// POST /api/whatsapp/enviar-um — Envia para 1 número (teste rápido)
router.post('/enviar-um', async (req, res) => {
    try {
        const { telefone, mensagem } = req.body;
        if (!telefone || !mensagem) return res.status(400).json({ error: 'telefone e mensagem são obrigatórios' });

        const { token, phoneId } = getMetaConfig();
        const result = await enviarMensagemMeta(telefone, mensagem, token, phoneId);

        res.json({ status: 'ok', resultado: result });
    } catch (err) {
        console.error('Erro enviar-um:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/whatsapp/disparar-numeros — Dispara para lista de {nome, telefone} sem precisar salvar no CRM
router.post('/disparar-numeros', async (req, res) => {
    try {
        const { mensagem, contatos, delay_ms = 3000, titulo_campanha } = req.body;

        if (!mensagem) return res.status(400).json({ error: 'mensagem é obrigatória' });
        if (!contatos?.length) return res.status(400).json({ error: 'Lista de contatos vazia' });

        // Filtrar apenas quem tem telefone
        const validos = contatos.filter(c => c.telefone && c.telefone.replace(/\D/g, '').length >= 8);
        if (!validos.length) return res.status(400).json({ error: 'Nenhum contato com telefone válido' });

        const { token, phoneId } = getMetaConfig();
        const campanha_id = `wpp_maps_${Date.now()}`;
        const titulo = titulo_campanha || `Disparo Prospecção ${new Date().toLocaleDateString('pt-BR')}`;

        res.json({ status: 'iniciado', campanha_id, total: validos.length, titulo });

        // Processar em background com delay
        (async () => {
            let enviados = 0, erros = 0;
            const resultados = [];

            for (const contato of validos) {
                try {
                    const msgPersonalizada = mensagem
                        .replace(/\{\{nome\}\}/gi, contato.nome?.split(' ')[0] || 'cliente')
                        .replace(/\{\{telefone\}\}/gi, contato.telefone || '');

                    await enviarMensagemMeta(contato.telefone, msgPersonalizada, token, phoneId);
                    enviados++;
                    resultados.push({ nome: contato.nome, telefone: contato.telefone, status: 'enviado' });

                    // Registrar progresso
                    await supabase.from('historico').insert({
                        tipo: 'whatsapp_campanha',
                        descricao: JSON.stringify({ campanha_id, titulo, enviados, erros, total: validos.length, status: 'em_andamento', resultados }),
                        usuario: 'disparo_prospeccao'
                    }).then(() => { });

                } catch (err) {
                    erros++;
                    resultados.push({ nome: contato.nome, telefone: contato.telefone, status: 'erro', erro: err.message });
                }

                if (delay_ms > 0) await new Promise(r => setTimeout(r, delay_ms));
            }

            // Finalizar campanha
            await supabase.from('historico').insert({
                tipo: 'whatsapp_campanha_fim',
                descricao: JSON.stringify({ campanha_id, titulo, enviados, erros, total: validos.length, status: 'concluida', resultados }),
                usuario: 'disparo_prospeccao'
            });

            console.log(`✅ Campanha prospecção ${campanha_id}: ${enviados}/${validos.length} enviados`);
        })();

    } catch (err) {
        console.error('Erro disparar-numeros:', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});


// POST /api/whatsapp/disparar — Disparo em massa com delay
router.post('/disparar', async (req, res) => {
    try {
        const { mensagem, cliente_ids, filtro_status, delay_ms = 2000, titulo_campanha } = req.body;

        if (!mensagem) return res.status(400).json({ error: 'mensagem é obrigatória' });
        if (!cliente_ids?.length && !filtro_status) return res.status(400).json({ error: 'Selecione os leads ou um status de filtro' });

        const { token, phoneId } = getMetaConfig();

        // Buscar clientes alvo
        let query = supabase.from('clientes').select('id, nome, telefone').not('telefone', 'is', null).neq('telefone', '');
        if (cliente_ids?.length) {
            query = query.in('id', cliente_ids);
        } else if (filtro_status) {
            query = query.eq('status', filtro_status);
        }
        const { data: clientes, error } = await query;
        if (error) throw error;

        const total = clientes.length;
        if (total === 0) return res.status(400).json({ error: 'Nenhum lead com telefone encontrado para os filtros selecionados' });

        // Registrar campanha no histórico
        const campanha_id = `wpp_${Date.now()}`;
        const titulo = titulo_campanha || `Disparo WhatsApp ${new Date().toLocaleDateString('pt-BR')}`;

        const resultados = [];
        let enviados = 0;
        let erros = 0;

        // Inicia processamento assíncrono e responde de imediato com a campanha_id
        res.json({ status: 'iniciado', campanha_id, total, titulo });

        // Processar envios em background com delay
        (async () => {
            for (const cliente of clientes) {
                try {
                    const msgPersonalizada = mensagem
                        .replace(/\{\{nome\}\}/gi, cliente.nome?.split(' ')[0] || 'cliente')
                        .replace(/\{\{telefone\}\}/gi, cliente.telefone || '');

                    await enviarMensagemMeta(cliente.telefone, msgPersonalizada, token, phoneId);

                    resultados.push({ cliente_id: cliente.id, nome: cliente.nome, telefone: cliente.telefone, status: 'enviado' });
                    enviados++;

                    // Registrar no histórico
                    await supabase.from('historico').insert({
                        cliente_id: cliente.id,
                        tipo: 'whatsapp_disparo',
                        descricao: JSON.stringify({ campanha_id, titulo, mensagem: msgPersonalizada, status: 'enviado' }),
                        usuario: 'disparo_wpp'
                    });

                    // Salvar progresso no histórico global da campanha
                    await supabase.from('historico').insert({
                        tipo: 'whatsapp_campanha',
                        descricao: JSON.stringify({ campanha_id, titulo, enviados, erros, total, status: 'em_andamento', resultados }),
                        usuario: 'disparo_wpp'
                    }).then(() => { });

                } catch (err) {
                    erros++;
                    resultados.push({ cliente_id: cliente.id, nome: cliente.nome, telefone: cliente.telefone, status: 'erro', erro: err.message });
                }

                // Delay entre envios
                if (delay_ms > 0) await new Promise(r => setTimeout(r, delay_ms));
            }

            // Marcar campanha como finalizada
            await supabase.from('historico').insert({
                tipo: 'whatsapp_campanha_fim',
                descricao: JSON.stringify({ campanha_id, titulo, enviados, erros, total, status: 'concluida', resultados }),
                usuario: 'disparo_wpp'
            });

            console.log(`✅ Campanha ${campanha_id} finalizada: ${enviados}/${total} enviados, ${erros} erros`);
        })();

    } catch (err) {
        console.error('Erro disparar:', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// GET /api/whatsapp/progresso/:campanhaId — Verifica progresso de uma campanha
router.get('/progresso/:campanhaId', async (req, res) => {
    try {
        const { campanhaId } = req.params;

        // Buscar último update da campanha
        const { data: fim } = await supabase.from('historico')
            .select('descricao, data_registro')
            .eq('tipo', 'whatsapp_campanha_fim')
            .like('descricao', `%${campanhaId}%`)
            .maybeSingle();

        if (fim) {
            return res.json({ ...JSON.parse(fim.descricao), finalizado: true });
        }

        const { data: andamento } = await supabase.from('historico')
            .select('descricao, data_registro')
            .eq('tipo', 'whatsapp_campanha')
            .like('descricao', `%${campanhaId}%`)
            .order('data_registro', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (andamento) {
            return res.json({ ...JSON.parse(andamento.descricao), finalizado: false });
        }

        res.json({ status: 'aguardando', finalizado: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/whatsapp/historico-disparos — Lista campanhas realizadas
router.get('/historico-disparos', async (req, res) => {
    try {
        const { data: campanhas, error } = await supabase.from('historico')
            .select('descricao, data_registro')
            .eq('tipo', 'whatsapp_campanha_fim')
            .order('data_registro', { ascending: false })
            .limit(30);

        if (error) throw error;

        const lista = (campanhas || []).map(c => {
            try {
                const d = JSON.parse(c.descricao);
                return { ...d, data: c.data_registro };
            } catch { return null; }
        }).filter(Boolean);

        res.json({ campanhas: lista });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
