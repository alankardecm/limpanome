// =============================================================
// PROVIDER: BIGDATACORP (real)
// =============================================================
// API "Pessoas/Empresas" da BigDataCorp.
// Docs: https://docs.bigdatacorp.com.br/
//
// Autenticação por headers AccessToken + TokenId.
// Os DATASETS disponíveis dependem do SEU contrato. Os campos mapeados
// abaixo seguem os datasets mais comuns (financial_risk / debts). Se o seu
// plano usar nomes/estruturas diferentes, ajuste `mapearResposta`.
// Marquei com  // CONFIRMAR  os pontos que dependem do seu contrato.

const { MARCADOR_DIVIDA, MARCADOR_BACEN } = require('../validators');

const nome = 'bigdatacorp';
const simulado = false;

const BASE_PESSOAS = 'https://plataforma.bigdatacorp.com.br/pessoas';
const BASE_EMPRESAS = 'https://plataforma.bigdatacorp.com.br/empresas';

function estaConfigurado() {
  return !!(process.env.BIGDATACORP_TOKEN_ID && process.env.BIGDATACORP_ACCESS_TOKEN);
}

async function consultar(docLimpo, ehCNPJ) {
  const tokenId = process.env.BIGDATACORP_TOKEN_ID;
  const accessToken = process.env.BIGDATACORP_ACCESS_TOKEN;
  // Datasets a solicitar — sobrescreva via env conforme seu contrato.  // CONFIRMAR
  const datasets = process.env.BIGDATACORP_DATASETS || 'basic_data,financial_risk';

  const endpoint = ehCNPJ ? BASE_EMPRESAS : BASE_PESSOAS;
  const q = ehCNPJ ? `doc{${docLimpo}}` : `doc{${docLimpo}}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AccessToken': accessToken,
      'TokenId': tokenId
    },
    body: JSON.stringify({ q, Datasets: datasets })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`BigDataCorp HTTP ${response.status}: ${JSON.stringify(data).substring(0, 300)}`);
  }

  return mapearResposta(data);
}

// Converte a resposta da BigDataCorp para o formato interno do CRM.
// ⚠️ Os caminhos abaixo (data.Result[0]...) seguem o padrão geral da API,
// mas a presença e o nome exato dos campos dependem dos datasets do contrato.
function mapearResposta(data) {
  const result = Array.isArray(data?.Result) ? data.Result[0] : (data?.Result || {});

  // Score — caminho típico do dataset financial_risk.  // CONFIRMAR
  const score =
    result?.FinancialRisk?.Score ??
    result?.financial_risk?.score ??
    null;

  const situacao =
    result?.RegistrationData?.TaxIdStatus ??
    result?.BasicData?.TaxIdStatus ??
    'REGULAR';

  // Dívidas/pendências.  // CONFIRMAR estrutura conforme dataset contratado.
  const pendencias =
    result?.Debts?.DebtsList ||
    result?.FinancialRisk?.Pendencies ||
    [];

  const dividas = (Array.isArray(pendencias) ? pendencias : []).map((d) => ({
    credor: d.Creditor || d.CreditorName || d.Origin || 'Não informado',
    valor_original: numero(d.OriginalValue ?? d.Value),
    valor_atualizado: numero(d.CurrentValue ?? d.UpdatedValue ?? d.Value),
    tipo: (d.ContractType || d.Nature || 'outro').toString().toLowerCase(),
    bureau: (d.Bureau || d.Source || 'serasa').toString().toLowerCase(),
    data_vencimento: dataISO(d.DueDate || d.Date),
    contrato: d.Contract || d.ContractNumber || null,
    status: 'ativa',
    observacoes: MARCADOR_DIVIDA
  }));

  // Apontamentos BACEN/SCR — normalmente NÃO vêm por API (ver nota no README).
  const apontamentos = result?.Bacen?.Records || [];
  const apontamentos_bacen = (Array.isArray(apontamentos) ? apontamentos : []).map((b) => ({
    tipo: b.Type || 'Vencido',
    instituicao: b.Institution || 'Não informado',
    valor: numero(b.Value),
    data_ocorrencia: dataISO(b.Date),
    status: 'ativo',
    observacoes: MARCADOR_BACEN
  }));

  return { score, situacao_cadastral: situacao, dividas, apontamentos_bacen };
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
