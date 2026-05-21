// Utiliza o fetch nativo global do Node 18+

function formatarTelefone(tel) {
    const limpo = (tel || '').replace(/\D/g, '');
    if (!limpo) return null;
    return limpo.startsWith('55') ? limpo : `55${limpo}`;
}

/**
 * Envia uma mensagem via Evolution API
 */
async function enviarEvolution(telefone, mensagem) {
    const url = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE_NAME;

    const cleanTel = formatarTelefone(telefone);
    if (!cleanTel) throw new Error('Telefone inválido para envio via Evolution');

    const endpoint = `${url}/message/sendText/${instance}`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
        },
        body: JSON.stringify({
            number: cleanTel,
            text: mensagem
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.message || `Erro HTTP ${response.status} na Evolution API`);
    }
    return data;
}

/**
 * Envia uma mensagem via Meta Cloud API
 */
async function enviarMeta(telefone, mensagem) {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;

    const cleanTel = formatarTelefone(telefone);
    if (!cleanTel) throw new Error('Telefone inválido para envio via Meta');

    const endpoint = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanTel,
            type: 'text',
            text: { body: mensagem }
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || `Erro HTTP ${response.status} na Meta API`);
    }
    return data;
}

/**
 * Envia uma mensagem de WhatsApp detectando a API configurada
 */
async function enviarMensagem(telefone, mensagem) {
    const useEvolution = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE_NAME);
    const useMeta = !!(process.env.META_WHATSAPP_TOKEN && process.env.META_PHONE_NUMBER_ID);

    if (useEvolution) {
        console.log(`[WhatsAppService] Enviando via Evolution API para: ${telefone}`);
        return await enviarEvolution(telefone, mensagem);
    } else if (useMeta) {
        console.log(`[WhatsAppService] Enviando via Meta Cloud API para: ${telefone}`);
        return await enviarMeta(telefone, mensagem);
    } else {
        console.warn(`[WhatsAppService] Nenhuma API configurada. Mensagem não enviada: "${mensagem.substring(0, 50)}"`);
        return { status: 'simulado', message: 'Sem provedor configurado' };
    }
}

/**
 * Envia notificação para a consultora/dono do CRM
 */
async function enviarNotificacaoInterna(mensagem) {
    const destino = process.env.NOTIF_WHATSAPP_NUMERO || '5519992244838';
    try {
        return await enviarMensagem(destino, mensagem);
    } catch (err) {
        console.error(`[WhatsAppService] Falha ao enviar notificação interna:`, err.message);
        return { erro: err.message };
    }
}

module.exports = {
    enviarMensagem,
    enviarNotificacaoInterna,
    formatarTelefone
};
