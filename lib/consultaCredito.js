/**
 * Serviço de Consulta de Crédito (Bureaus e Banco Central) — ORQUESTRADOR
 *
 * Seleciona o provider via env CREDITO_PROVIDER:
 *   - simulado     (default) → dados ILUSTRATIVOS, marca `simulado: true`
 *   - bigdatacorp  → BigDataCorp (requer BIGDATACORP_TOKEN_ID/ACCESS_TOKEN)
 *   - assertiva    → Assertiva  (requer ASSERTIVA_CLIENT_ID/SECRET)
 *
 * Se o provider escolhido não tiver credenciais, cai para o simulado
 * automaticamente (e o retorno fica marcado como simulado).
 *
 * A API pública (realizarConsulta / validarCPF / validarCNPJ) e o formato
 * de retorno foram mantidos para não quebrar routes/clientes.js.
 */

const { limparDocumento, validarCPF, validarCNPJ } = require('./credito/validators');

const PROVIDERS = {
  simulado: require('./credito/providers/simulado'),
  bigdatacorp: require('./credito/providers/bigdatacorp'),
  assertiva: require('./credito/providers/assertiva')
};

function selecionarProvider() {
  const escolhido = (process.env.CREDITO_PROVIDER || 'simulado').toLowerCase().trim();
  const provider = PROVIDERS[escolhido];

  if (!provider) {
    console.warn(`[ConsultaCredito] Provider '${escolhido}' desconhecido. Usando 'simulado'.`);
    return PROVIDERS.simulado;
  }
  if (typeof provider.estaConfigurado === 'function' && !provider.estaConfigurado()) {
    console.warn(`[ConsultaCredito] Provider '${escolhido}' sem credenciais configuradas. Caindo para 'simulado'.`);
    return PROVIDERS.simulado;
  }
  return provider;
}

async function realizarConsulta(documento) {
  const docLimpo = limparDocumento(documento);
  const ehCNPJ = docLimpo.length === 14;

  if (!ehCNPJ && !validarCPF(docLimpo)) {
    throw new Error('CPF inválido');
  }
  if (ehCNPJ && !validarCNPJ(docLimpo)) {
    throw new Error('CNPJ inválido');
  }

  const provider = selecionarProvider();
  console.log(`[ConsultaCredito] Provider='${provider.nome}' | ${ehCNPJ ? 'CNPJ' : 'CPF'}: ${docLimpo}`);

  const r = await provider.consultar(docLimpo, ehCNPJ);

  return {
    documento: docLimpo,
    tipo: ehCNPJ ? 'PJ' : 'PF',
    score: r.score ?? null,
    situacao_cadastral: r.situacao_cadastral || 'REGULAR',
    dividas: r.dividas || [],
    apontamentos_bacen: r.apontamentos_bacen || [],
    provider: provider.nome,
    simulado: provider.simulado === true,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  realizarConsulta,
  validarCPF,
  validarCNPJ
};
