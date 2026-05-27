const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const supabase = require('../lib/supabase');

// POST /api/marketing/gerar — Gera criativo (texto + prompt + imagem DALL-E)
router.post('/gerar', async (req, res) => {
  try {
    const { topic, tone } = req.body;
    if (!topic || !tone) {
      return res.status(400).json({ error: 'topic e tone são obrigatórios' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor' });
    }

    // Traduzir tópicos para contexto em português
    const topicsMap = {
      score: 'Aumento de Score de Crédito e score baixo',
      limpar_nome: 'Limpeza de nome negativado nos birôs via liminar judicial baseada no CDC',
      bacen: 'Remoção de apontamentos e restrições no BACEN (Registrato / SCR)',
      dicas: 'Dicas financeiras, organização e reabilitação de crédito',
      blindagem: 'Blindagem de nome nos birôs de crédito (Serasa, SPC, Boa Vista) por 6 a 12 meses'
    };

    const topicDesc = topicsMap[topic] || topic;

    // 1. Chamar GPT para gerar a legenda e o prompt da imagem em formato JSON
    const promptSystem = `Você é um redator publicitário de alto desempenho da Amarilis Soluções. Você cria posts magnéticos e persuasivos para o Instagram focados em reabilitação de crédito e limpeza de nome.
Você deve retornar APENAS um objeto JSON com duas chaves exatamente como descritas abaixo:
{
  "caption": "texto da legenda do Instagram em português (com emojis, parágrafos curtos, bullet points e uma forte chamada para ação)",
  "imagePrompt": "um prompt em inglês altamente descritivo para o DALL-E 3 gerar a imagem do post"
}
Regras críticas para o "imagePrompt":
- Não inclua nenhuma palavra, letra, caractere ou logotipo na imagem (para evitar erros ortográficos do DALL-E). Escreva explicitamente: "No text, no letters, no logos".
- Descreva um cenário limpo, moderno e profissional relacionado a finanças, crescimento, alívio financeiro, martelo da justiça, chaves ou escudos.
- Use estilo moderno de design gráfico ou foto profissional 3D com iluminação suave.`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: promptSystem },
          { role: 'user', content: `Gere um post sobre o tema: "${topicDesc}". Tom de voz: "${tone}".` }
        ],
        temperature: 0.7
      })
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      throw new Error(`Erro na API do OpenAI (GPT): ${errText}`);
    }

    const chatData = await chatResponse.json();
    let content = chatData.choices[0].message.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }
    const resultObj = JSON.parse(content);

    // 2. Chamar DALL-E 3 para gerar a imagem
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `${resultObj.imagePrompt}, professional graphic style, sleek corporate color palette, high resolution, clean background, no text, no letters`,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      throw new Error(`Erro na API do OpenAI (DALL-E): ${errText}`);
    }

    const imageData = await imageResponse.json();
    const generatedImageUrl = imageData.data[0].url;

    res.json({
      caption: resultObj.caption,
      imageUrl: generatedImageUrl,
      imagePrompt: resultObj.imagePrompt
    });

  } catch (err) {
    console.error('Erro ao gerar criativo:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/publicar — Publica o criativo no Instagram
router.post('/publicar', async (req, res) => {
  try {
    const { imageUrl, caption, instagramBusinessAccountId } = req.body;

    if (!imageUrl || !caption) {
      return res.status(400).json({ error: 'imageUrl e caption são obrigatórios' });
    }

    // 1. Obter o ID da Conta Comercial do Instagram
    const instagramId = instagramBusinessAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    if (!instagramId) {
      return res.status(400).json({ error: 'Instagram Business Account ID não configurado no servidor nem enviado no corpo' });
    }

    // 2. Tentar ler o token do Meta da pasta raiz (token meta.txt) ou fallback para env
    let instagramToken = process.env.META_INSTAGRAM_TOKEN;
    try {
      const tokenPath = path.join(__dirname, '../token meta.txt');
      if (fs.existsSync(tokenPath)) {
        const fileContent = fs.readFileSync(tokenPath, 'utf8');
        const lines = fileContent.split('\n');
        const found = lines.find(l => l.trim().startsWith('IGAA') || l.trim().startsWith('EAAD') || l.trim().startsWith('EAAC'));
        if (found) {
          instagramToken = found.trim();
        }
      }
    } catch (e) {
      console.warn('Erro ao ler token meta.txt:', e.message);
    }

    if (!instagramToken) {
      return res.status(500).json({ error: 'Token do Instagram não encontrado no servidor' });
    }

    // 3. Download da imagem gerada pelo DALL-E para Buffer
    const imgFetch = await fetch(imageUrl);
    if (!imgFetch.ok) {
      throw new Error('Não foi possível obter a imagem temporária do OpenAI para fazer upload');
    }
    const arrayBuffer = await imgFetch.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload para o Supabase Storage (pasta marketing) para ter URL pública permanente
    const timestamp = Date.now();
    const filePath = `marketing/post_${timestamp}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath);
    
    const publicImageUrl = urlData.publicUrl;

    // 5. Publicação via API Graph do Instagram (Passo A: Criar Container de Mídia)
    const mediaContainerUrl = `https://graph.facebook.com/v19.0/${instagramId}/media`;
    const containerRes = await fetch(mediaContainerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: publicImageUrl,
        caption: caption,
        access_token: instagramToken
      })
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(`Erro ao criar contêiner de mídia no Meta API: ${containerData.error?.message || JSON.stringify(containerData)}`);
    }

    const creationId = containerData.id;

    // 6. Publicação via API Graph do Instagram (Passo B: Publicar Mídia)
    const mediaPublishUrl = `https://graph.facebook.com/v19.0/${instagramId}/media_publish`;
    const publishRes = await fetch(mediaPublishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: instagramToken
      })
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(`Erro ao publicar contêiner no Meta API: ${publishData.error?.message || JSON.stringify(publishData)}`);
    }

    // Registrar sucesso no histórico técnico do CRM
    await supabase.from('historico').insert({
      tipo: 'instagram_post',
      descricao: `Post publicado com sucesso no Instagram. Media ID: ${publishData.id}. URL da imagem: ${publicImageUrl}`,
      usuario: req.user?.email || 'sistema'
    });

    res.json({
      status: 'success',
      mediaId: publishData.id,
      imageUrl: publicImageUrl
    });

  } catch (err) {
    console.error('Erro ao publicar criativo:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
