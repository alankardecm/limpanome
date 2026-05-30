// =============================================================
// PROVIDER: SIMULADO  ⚠️  DADOS ILUSTRATIVOS — NÃO É CONSULTA REAL
// =============================================================
// Gera score/dívidas/BACEN determinísticos a partir do documento.
// Usado como fallback quando nenhum provider real está configurado.
// O orquestrador marca o retorno com `simulado: true` para o front avisar.

const { MARCADOR_DIVIDA, MARCADOR_BACEN } = require('../validators');

const nome = 'simulado';
const simulado = true;

// O simulado está sempre "configurado" (é o fallback).
function estaConfigurado() {
  return true;
}

async function consultar(docLimpo /*, ehCNPJ */) {
  // Semente determinística pelos 2 últimos dígitos do documento.
  const semente = parseInt(docLimpo.slice(-2)) || 0;

  let score = 150 + (semente * 8);
  if (score > 1000) score = 980;

  const dividas = [];
  const bacen = [];

  if (score < 700) {
    const credores = [
      { nome: 'Banco Itaú Unibanco S.A.', tipo: 'emprestimo' },
      { nome: 'Caixa Econômica Federal', tipo: 'financiamento' },
      { nome: 'Fundo Recovery (Cessão Itaú)', tipo: 'outro' },
      { nome: 'Banco Bradesco S.A.', tipo: 'cartao' },
      { nome: 'Claro S.A. (Negativação)', tipo: 'boleto' },
      { nome: 'Ativos S.A. Securitizadora', tipo: 'outro' },
      { nome: 'Porto Seguro Cartões', tipo: 'cartao' }
    ];

    const numDividas = (semente % 4) + 1;
    for (let i = 0; i < numDividas; i++) {
      const credor = credores[(semente + i) % credores.length];
      const valorOrig = 1200 + (semente * 85) + (i * 320);
      const valorAtu = valorOrig * 1.35;
      const bureaus = ['serasa', 'spc', 'boa_vista'];
      const bureau = bureaus[(semente + i) % bureaus.length];

      const dataVenc = new Date();
      dataVenc.setDate(dataVenc.getDate() - (60 + (semente * 10) + (i * 45)));

      dividas.push({
        credor: credor.nome,
        valor_original: parseFloat(valorOrig.toFixed(2)),
        valor_atualizado: parseFloat(valorAtu.toFixed(2)),
        tipo: credor.tipo,
        bureau,
        data_vencimento: dataVenc.toISOString().split('T')[0],
        contrato: `CTR-${100000 + semente + (i * 99)}`,
        status: 'ativa',
        observacoes: MARCADOR_DIVIDA
      });
    }
  }

  if (score < 500) {
    const instituicoes = ['Banco Santander (Brasil) S.A.', 'Banco do Brasil S.A.', 'Itaú Unibanco', 'Nu Financeira S.A.'];
    const numBacen = (semente % 2) + 1;
    for (let i = 0; i < numBacen; i++) {
      const valorBacen = 5000 + (semente * 300) + (i * 1200);
      const dataOcorr = new Date();
      dataOcorr.setDate(dataOcorr.getDate() - (90 + (semente * 5)));

      bacen.push({
        tipo: (semente % 2 === 0) ? 'Prejuízo' : 'Vencido',
        instituicao: instituicoes[(semente + i) % instituicoes.length],
        valor: parseFloat(valorBacen.toFixed(2)),
        data_ocorrencia: dataOcorr.toISOString().split('T')[0],
        status: 'ativo',
        observacoes: MARCADOR_BACEN
      });
    }
  }

  // Simula latência de rede.
  await new Promise(resolve => setTimeout(resolve, 600));

  return {
    score,
    situacao_cadastral: 'REGULAR',
    dividas,
    apontamentos_bacen: bacen
  };
}

module.exports = { nome, simulado, estaConfigurado, consultar };
