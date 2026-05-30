// Validação de documentos (CPF/CNPJ) — compartilhado entre os providers de consulta.

function limparDocumento(doc) {
  return (doc || '').replace(/\D/g, '');
}

function validarCPF(cpf) {
  const limpo = limparDocumento(cpf);
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.substring(10, 11))) return false;
  return true;
}

function validarCNPJ(cnpj) {
  const limpo = limparDocumento(cnpj);
  if (limpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(limpo)) return false;
  let tamanho = limpo.length - 2;
  let numeros = limpo.substring(0, tamanho);
  let digitos = limpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  return true;
}

// Marcadores usados em `observacoes` para que routes/clientes.js consiga
// localizar e substituir os registros de consultas automáticas anteriores.
// IMPORTANTE: manter idêntico em todos os providers (clientes.js usa match exato).
const MARCADOR_DIVIDA = 'Registro importado via consulta automática de birô de crédito.';
const MARCADOR_BACEN = 'Apontamento registrado no SCR - Sistema de Informações de Crédito do Banco Central.';

module.exports = {
  limparDocumento,
  validarCPF,
  validarCNPJ,
  MARCADOR_DIVIDA,
  MARCADOR_BACEN
};
