const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { gerarResposta } = require('../lib/sdrAgent');
const whatsappService = require('../lib/whatsappService');

// =============================================
// IA SDR — Agente de Conversão via WhatsApp
// =============================================

// POST /api/ia-sdr/webhook — Recebe mensagem do WhatsApp (público)
router.post('/webhook', async (req, res) => {
    try {
        const { telefone, mensagem, nome } = req.body;

        if (!telefone || !mensagem) {
            return res.status(400).json({ error: 'telefone e mensagem são obrigatórios' });
        }

        const telLimpo = telefone.replace(/\D/g, '');

        // 1. Buscar ou criar lead no Supabase
        let { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('telefone', telLimpo)
            .maybeSingle();

        if (!cliente) {
            const { data: novo, error } = await supabase
                .from('clientes')
                .insert({
                    nome: nome || 'Lead WhatsApp',
                    telefone: telLimpo,
                    cpf: `WPP${telLimpo}`,
                    origem: 'whatsapp',
                    status: 'lead'
                })
                .select('*')
                .single();

            if (error) throw error;
            cliente = novo;
        }

        // 2. Buscar histórico de conversa
        const { data: historico } = await supabase
            .from('historico')
            .select('*')
            .eq('cliente_id', cliente.id)
            .eq('tipo', 'ia_sdr')
            .order('data_registro', { ascending: true })
            .limit(20);

        const historicoConversa = (historico || []).map(h => {
            const parsed = JSON.parse(h.descricao || '{}');
            return { remetente: parsed.remetente || 'lead', texto: parsed.texto || h.descricao };
        });

        // 3. Verificar se IA SDR está ativa para este lead
        const { data: config } = await supabase
            .from('historico')
            .select('descricao')
            .eq('cliente_id', cliente.id)
            .eq('tipo', 'ia_sdr_config')
            .maybeSingle();

        const iaAtiva = !config || !JSON.parse(config?.descricao || '{}').desativada;

        if (!iaAtiva) {
            return res.json({ status: 'ia_desativada', mensagem: 'IA SDR desativada para este lead' });
        }

        // 4. Registrar mensagem do lead
        await supabase.from('historico').insert({
            cliente_id: cliente.id,
            tipo: 'ia_sdr',
            descricao: JSON.stringify({ remetente: 'lead', texto: mensagem }),
            usuario: 'ia-sdr'
        });

        // 5. Gerar resposta da IA
        const resultado = await gerarResposta(mensagem, historicoConversa, cliente);

        if (resultado.erro) {
            console.error('Erro IA SDR:', resultado.erro);
            return res.status(500).json({ error: resultado.erro });
        }

        // 6. Registrar resposta da IA
        await supabase.from('historico').insert({
            cliente_id: cliente.id,
            tipo: 'ia_sdr',
            descricao: JSON.stringify({ remetente: 'ia', texto: resultado.resposta }),
            usuario: 'ia-sdr'
        });

        // 7. Se precisa escalar, criar tarefa e desativar IA
        if (resultado.escalar) {
            await supabase.from('tarefas').insert({
                cliente_id: cliente.id,
                titulo: `🚨 Lead qualificado para consulta: ${cliente.nome}`,
                descricao: `A IA SDR identificou que o lead quer agendar consulta. Última mensagem: "${mensagem}". Entrar em contato imediatamente.`,
                prioridade: 'alta',
                status: 'pendente',
                data_vencimento: new Date().toISOString().split('T')[0]
            });

            // Desativar IA para este lead
            await supabase.from('historico').insert({
                cliente_id: cliente.id,
                tipo: 'ia_sdr_config',
                descricao: JSON.stringify({ desativada: true, motivo: 'escalado_para_humano' }),
                usuario: 'ia-sdr'
            });

            // Atualizar status do cliente
            await supabase
                .from('clientes')
                .update({ status: 'em_atendimento' })
                .eq('id', cliente.id);

            // 7.1 Notificar o dono via WhatsApp
            const notifMsg = `🚨 *LEAD QUALIFICADO!*\n\n` +
                `👤 *Nome:* ${cliente.nome}\n` +
                `📱 *Telefone:* ${cliente.telefone}\n` +
                `💬 *Última msg:* "${mensagem}"\n` +
                `🤖 *Ana respondeu:* "${resultado.resposta?.substring(0, 100)}..."\n\n` +
                `⚡ Abra o CRM para ver a conversa completa e entre em contato!`;

            try {
                await whatsappService.enviarNotificacaoInterna(notifMsg);
                console.log('Notificação enviada para o consultor.');
            } catch (notifErr) {
                console.error('Erro ao enviar notificação:', notifErr.message);
            }
        }

        // 8. Atualizar dados extraídos (CPF, etc.)
        if (resultado.dadosExtraidos?.cpf && !cliente.cpf) {
            await supabase
                .from('clientes')
                .update({ cpf: resultado.dadosExtraidos.cpf })
                .eq('id', cliente.id);
        }

        // 9. Enviar resposta via WhatsApp
        try {
            await whatsappService.enviarMensagem(telLimpo, resultado.resposta);
        } catch (whatsappErr) {
            console.error('Erro ao enviar resposta via WhatsApp:', whatsappErr.message);
        }

        res.json({
            status: 'ok',
            resposta: resultado.resposta,
            escalado: resultado.escalar,
            cliente_id: cliente.id
        });
    } catch (err) {
        console.error('Erro IA SDR webhook:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ia-sdr/conversas — Lista conversas ativas
router.get('/conversas', async (req, res) => {
    try {
        const { data: conversas, error } = await supabase
            .from('historico')
            .select('cliente_id, data_registro, clientes(id, nome, telefone, status)')
            .eq('tipo', 'ia_sdr')
            .order('data_registro', { ascending: false })
            .limit(100);

        if (error) throw error;

        // Agrupar por cliente
        const agrupado = {};
        for (const c of (conversas || [])) {
            if (!c.cliente_id) continue;
            if (!agrupado[c.cliente_id]) {
                agrupado[c.cliente_id] = {
                    cliente_id: c.cliente_id,
                    nome: c.clientes?.nome || 'Desconhecido',
                    telefone: c.clientes?.telefone || '',
                    status: c.clientes?.status || 'lead',
                    ultima_msg: c.data_registro,
                    total_msgs: 0
                };
            }
            agrupado[c.cliente_id].total_msgs++;
        }

        const lista = Object.values(agrupado).sort((a, b) =>
            new Date(b.ultima_msg) - new Date(a.ultima_msg)
        );

        res.json({ conversas: lista });
    } catch (err) {
        console.error('Erro conversas:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ia-sdr/conversa/:clienteId — Histórico de uma conversa
router.get('/conversa/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;

        const { data: mensagens, error } = await supabase
            .from('historico')
            .select('*')
            .eq('cliente_id', clienteId)
            .eq('tipo', 'ia_sdr')
            .order('data_registro', { ascending: true });

        if (error) throw error;

        const conversa = (mensagens || []).map(m => {
            const parsed = JSON.parse(m.descricao || '{}');
            return {
                id: m.id,
                remetente: parsed.remetente || 'desconhecido',
                texto: parsed.texto || m.descricao,
                timestamp: m.data_registro
            };
        });

        res.json({ mensagens: conversa });
    } catch (err) {
        console.error('Erro conversa:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ia-sdr/toggle — Ativar/desativar IA para um lead
router.post('/toggle', async (req, res) => {
    try {
        const { cliente_id, ativa } = req.body;

        await supabase.from('historico').insert({
            cliente_id,
            tipo: 'ia_sdr_config',
            descricao: JSON.stringify({ desativada: !ativa }),
            usuario: 'manual'
        });

        res.json({ status: 'ok', ia_ativa: ativa });
    } catch (err) {
        console.error('Erro toggle:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
