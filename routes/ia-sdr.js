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
        let { telefone, mensagem, nome } = req.body;

        // Se for um payload de webhook da Evolution API
        if (req.body.event) {
            if (req.body.event !== 'messages.upsert') {
                return res.json({ status: 'ignored', reason: `evento ${req.body.event} nao tratado` });
            }
            
            const data = req.body.data;
            
            // Ignorar se a mensagem foi enviada por nós mesmos para evitar loop
            if (data?.key?.fromMe) {
                return res.json({ status: 'ignored', reason: 'mensagem enviada pelo proprio bot' });
            }
            
            telefone = (data?.key?.remoteJid || '').split('@')[0];
            nome = data?.pushName || '';
            mensagem = data?.message?.conversation || 
                       data?.message?.extendedTextMessage?.text || 
                       data?.message?.imageMessage?.caption || 
                       '';
        }

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

// GET /api/ia-sdr/connect-view — Renderiza o QR Code do WhatsApp em tempo real com auto-refresh
router.get('/connect-view', async (req, res) => {
    try {
        const url = `${process.env.EVOLUTION_API_URL || 'http://localhost:8084'}/instance/connect/${process.env.EVOLUTION_INSTANCE_NAME || 'limpa_nome_instance'}`;
        const apiKey = process.env.EVOLUTION_API_KEY || 'evo_api_key_2026_secure_key_192';

        const response = await fetch(url, {
            headers: { 'apikey': apiKey }
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.send(`
                <html>
                <body style="font-family: sans-serif; background-color: #121212; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <h2 style="color: #ff4a4a;">Erro ao conectar com a Evolution API</h2>
                    <p>${JSON.stringify(data)}</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; background-color: #00e676; border: none; border-radius: 5px; color: #000; cursor: pointer; font-weight: bold; margin-top: 20px;">Tentar Novamente</button>
                </body>
                </html>
            `);
        }

        // Tentar obter a string base64
        const base64Data = data.base64 || data.qrcode?.base64 || data.code;

        if (!base64Data) {
            return res.send(`
                <html>
                <body style="font-family: sans-serif; background-color: #121212; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <h2 style="color: #ffa726;">QR Code ainda não gerado ou dispositivo já conectado</h2>
                    <p>Resposta da API: ${JSON.stringify(data)}</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; background-color: #00e676; border: none; border-radius: 5px; color: #000; cursor: pointer; font-weight: bold; margin-top: 20px;">Atualizar</button>
                </body>
                </html>
            `);
        }

        let cleanBase64 = base64Data;
        if (!cleanBase64.startsWith('data:image')) {
            cleanBase64 = `data:image/png;base64,${cleanBase64}`;
        }

        res.send(`
            <html>
            <head>
                <title>Conectar WhatsApp - CRM Limpa Nome</title>
                <!-- Auto-recarrega a página a cada 15 segundos para pegar o QR Code novo antes de expirar -->
                <meta http-equiv="refresh" content="15">
            </head>
            <body style="font-family: sans-serif; background-color: #121212; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
                <div style="background-color: #1e1e1e; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 100%;">
                    <h2 style="margin-top: 0; color: #00e676;">Escaneie o QR Code</h2>
                    <p style="color: #aaa; font-size: 14px; margin-bottom: 25px;">A página recarrega automaticamente a cada 15s para manter o código válido.</p>
                    
                    <div style="background: #fff; padding: 15px; border-radius: 8px; display: inline-block; margin-bottom: 25px;">
                        <img src="${cleanBase64}" style="width: 250px; height: 250px; display: block;" alt="WhatsApp QR Code"/>
                    </div>
                    
                    ${data.pairingCode ? `<div style="margin-bottom: 20px; background-color: #2e2e2e; padding: 10px; border-radius: 5px;"><span style="color: #aaa; font-size: 13px;">Código de Pareamento:</span> <strong style="color: #00e676; font-size: 18px; display: block; margin-top: 5px;">${data.pairingCode}</strong></div>` : ''}

                    <div style="font-size: 12px; color: #666;">
                        Tentativa: ${data.count || 1} | Instância: ${process.env.EVOLUTION_INSTANCE_NAME || 'limpa_nome_instance'}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send(`Erro interno ao gerar página de conexão: ${err.message}`);
    }
});

module.exports = router;
