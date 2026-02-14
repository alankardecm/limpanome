// =============================================
// GOOGLE APPS SCRIPT - Webhook para CRM Limpa Nome
// =============================================
// Cole este código em: Google Forms → ⋮ → Editor de Script
// Depois crie o gatilho: onFormSubmit → Ao enviar formulário
// =============================================

function onFormSubmit(e) {
  var r = e.namedValues;

  var payload = {
    nome:               (r['Nome Completo'] || [''])[0],
    cpf:                (r['CPF'] || [''])[0],
    telefone:           (r['Telefone'] || [''])[0],
    email:              (r['Email'] || [''])[0],
    cidade:             (r['Cidade'] || [''])[0],
    estado:             (r['Estado'] || [''])[0],
    servico_contratado: (r['Serviço Contratado'] || [''])[0],
    observacoes:        (r['Observações'] || [''])[0]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(
    'https://limpanome-t73d.vercel.app/api/webhook/forms',
    options
  );

  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}

// Função de teste manual (para verificar se o webhook está funcionando)
function testeManual() {
  var payload = {
    nome: 'Teste Google Forms',
    cpf: '00000000000',
    telefone: '11999999999',
    email: 'teste@teste.com',
    cidade: 'São Paulo',
    estado: 'SP',
    servico_contratado: 'Diagnóstico Financeiro, Limpa Nome (SCPC, Serasa, etc)',
    observacoes: 'Cadastro de teste via Apps Script'
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(
    'https://limpanome-t73d.vercel.app/api/webhook/forms',
    options
  );

  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}
