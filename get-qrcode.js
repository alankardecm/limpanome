require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function getQrCode() {
    const url = `${process.env.EVOLUTION_API_URL || 'http://localhost:8084'}/instance/connect/${process.env.EVOLUTION_INSTANCE_NAME || 'limpa_nome_instance'}`;
    const apiKey = process.env.EVOLUTION_API_KEY || 'evo_api_key_2026_secure_key_192';

    console.log(`Buscando QR Code em: ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': apiKey
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Erro na resposta da API:', data);
            return;
        }

        // A API retorna a string base64 do QR Code no objeto data.base64
        const base64Data = data.base64 || data.qrcode?.base64 || data.code;

        if (!base64Data) {
            console.error('Nenhum dado de QR Code ou base64 encontrado na resposta. Resposta:', data);
            return;
        }

        let cleanBase64 = base64Data;
        if (cleanBase64.startsWith('data:image')) {
            cleanBase64 = cleanBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        }

        const outputPath = path.join(__dirname, 'public', 'qrcode.png');
        fs.writeFileSync(outputPath, cleanBase64, 'base64');
        console.log('\n==================================================');
        console.log('✅ QR Code salvo com sucesso em public/qrcode.png!');
        console.log('👉 Acesse o link abaixo para escanear no seu celular:');
        console.log('   http://217.196.61.190:3000/qrcode.png');
        console.log('==================================================\n');
    } catch (err) {
        console.error('Erro ao buscar o QR Code:', err.message);
    }
}

getQrCode();
