// =============================================================
// PROVIDER: ASSERTIVA (real)
// =============================================================
// Assertiva Soluções — APIs de Score e Recupere (pendências financeiras).
// Docs: https://api.assertivasolucoes.com.br/  (portal do desenvolvedor)
//
// Fluxo: OAuth2 client_credentials (Basic base64(client_id:client_secret))
// → token bearer → chamadas de Score / Recupere.
// Os caminhos de resposta marcados com // CONFIRMAR dependem do seu plano.

const { MARCADOR_DIVIDA } = require('../validators');

const nome = 'assertiva';
const simulado = false;

function baseUrl() {
  return (process.env.ASSERTIVA_BASE_URL || 'https://api.assertivasolucoes.com.br').replace(/\/$/, '');
}

function estaConfigurado() {
  return !!(process.env.ASSERTIVA_CLIENT_ID && process.env.ASSERTIVA_CLIENT_SECRET);
}

async function obterToken() {
  const id = process.env.ASSERTIVA_CLIENT_ID;
  const secret = process.env.ASSERTIVA_CLIENT_SECRET;
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');

  const resp = await fetch(`${baseUrl()}/oauth2/v3/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Assertiva OAuth HTTP ${resp.status}: ${JSON.stringify(data).substring(0, 200)}`);
  }
  return data.access_token;
}

async function consultar(docLimpo, ehCNPJ) {
  const token = await obterToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const tipoDoc = ehCNPJ ? 'cnpj' : 'cpf';

  // 1) Score.  // CONFIRMAR endpoint/versão conforme contrato (ex.: /score/v3/...)
  let score = null;
  let situacao = 'REGULAR';
  try {
    const scoreResp = await fetch(`${baseUrl()}/score/v3/${tipoDoc}/${docLimpo}`, { headers });
    if (scoreResp.ok) {
      const s = await scoreResp.json();
      score = s?.resposta?.score ?? s?.score ?? null;          // CONFIRMAR
      situacao = s?.resposta?.situacaoCadastral ?? situacao;   // CONFIRMAR
    }
  } catch (e) {
    console.warn('[Assertiva] Falha ao obter score:', e.message);
  }

  // 2) Recupere — pendências/dívidas.  // CONFIRMAR endpoint conforme contrato
  const dividas = [];
  try {
    const recResp = await fetch(`${baseUrl()}/recupere/v3/${tipoDoc}/${docLimpo}`, { headers });
    if (recResp.ok) {
      const r = await recResp.json();
      const lista = r?.resposta?.dividas || r?.dividas || [];   // CONFIRMAR
      for (const d of (Array.isArray(lista) ? lista : [])) {
        dividas.push({
          credor: d.credor || d.nomeCredor || 'Não informado',
          valor_original: numero(d.valorOriginal ?? d.valor),
          valor_atualizado: numero(d.valorAtualizado ?? d.valor),
          tipo: (d.tipo || d.natureza || 'outro').toString().toLowerCase(),
          bureau: 'serasa',
          data_vencimento: dataISO(d.dataVencimento || d.data),
          contrato: d.contrato || null,
          status: 'ativa',
          observacoes: MARCADOR_DIVIDA
        });
      }
    }
  } catch (e) {
    console.warn('[Assertiva] Falha ao obter pendências:', e.message);
  }

  // BACEN/SCR não é exposto por API comercial (ver nota no README).
  return { score, situacao_cadastral: situacao, dividas, apontamentos_bacen: [] };
}

function numero(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0;
}

function dataISO(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

module.exports = { nome, simulado, estaConfigurado, consultar };
