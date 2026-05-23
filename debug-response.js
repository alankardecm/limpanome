require('dotenv').config();

async function debug() {
    const url = `${process.env.EVOLUTION_API_URL || 'http://localhost:8084'}/instance/connect/${process.env.EVOLUTION_INSTANCE_NAME || 'limpa_nome_instance'}`;
    const apiKey = process.env.EVOLUTION_API_KEY || 'evo_api_key_2026_secure_key_192';

    console.log(`Buscando em: ${url}`);
    try {
        const response = await fetch(url, {
            headers: { 'apikey': apiKey }
        });
        const data = await response.json();
        console.log('Chaves retornadas:', Object.keys(data));
        if (data.code) {
            console.log('data.code tipo:', typeof data.code);
            console.log('data.code tamanho:', data.code.length);
            console.log('data.code comecinho:', data.code.substring(0, 100));
        }
        if (data.base64) {
            console.log('data.base64 tipo:', typeof data.base64);
            console.log('data.base64 tamanho:', data.base64.length);
            console.log('data.base64 comecinho:', data.base64.substring(0, 100));
        }
        if (data.qrcode) {
            console.log('data.qrcode chaves:', Object.keys(data.qrcode));
            if (data.qrcode.base64) {
                console.log('data.qrcode.base64 comecinho:', data.qrcode.base64.substring(0, 100));
            }
        }
        // Se houver algum erro ou status diferente
        if (data.status || data.error) {
            console.log('Erro/Status retornado:', data);
        }
    } catch (e) {
        console.error('Erro na requisição:', e);
    }
}
debug();
