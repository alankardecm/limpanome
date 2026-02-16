// =============================================
// GOOGLE APPS SCRIPT - Webhook para CRM Limpa Nome
// =============================================
// Cole este código em: Google Forms → ⋮ → Editor de Script
// Depois crie o gatilho: onFormSubmit → Ao enviar formulário
// =============================================

function onFormSubmit(e) {
  try {
    var payload = {};

    // Método 1: Tentar usar namedValues (padrão)
    if (e && e.namedValues) {
      var r = e.namedValues;
      payload = {
        nome: (r['Nome Completo'] || [''])[0],
        cpf: (r['CPF'] || [''])[0],
        telefone: (r['Telefone'] || [''])[0],
        email: (r['Email'] || [''])[0],
        data_nascimento: (r['Data Nascimento'] || r['Data de Nascimento'] || [''])[0],
        cidade: (r['Cidade'] || [''])[0],
        estado: (r['Estado'] || [''])[0],
        servico_contratado: (r['Serviço Contratado'] || r['SERVIÇO'] || r['Servico Contratado'] || [''])[0],
        observacoes: (r['Observações'] || r['Observacoes'] || [''])[0]
      };
      Logger.log('Método namedValues usado com sucesso');
    }
    // Método 2: Fallback usando e.response.getItemResponses()
    else if (e && e.response) {
      var items = e.response.getItemResponses();
      var respostas = {};
      for (var i = 0; i < items.length; i++) {
        var titulo = items[i].getItem().getTitle();
        var valor = items[i].getResponse();
        respostas[titulo] = valor;
      }
      Logger.log('Respostas capturadas via e.response: ' + JSON.stringify(respostas));

      payload = {
        nome: respostas['Nome Completo'] || '',
        cpf: respostas['CPF'] || '',
        telefone: respostas['Telefone'] || '',
        email: respostas['Email'] || '',
        data_nascimento: respostas['Data Nascimento'] || respostas['Data de Nascimento'] || '',
        cidade: respostas['Cidade'] || '',
        estado: respostas['Estado'] || '',
        servico_contratado: respostas['Serviço Contratado'] || respostas['SERVIÇO'] || respostas['Servico Contratado'] || '',
        observacoes: respostas['Observações'] || respostas['Observacoes'] || ''
      };

      // Se servico_contratado vier como array (checkbox), juntar com vírgula
      if (Array.isArray(payload.servico_contratado)) {
        payload.servico_contratado = payload.servico_contratado.join(', ');
      }
      Logger.log('Método e.response usado com sucesso');
    }
    // Método 3: Último recurso - capturar da planilha de respostas
    else if (e && e.values) {
      Logger.log('Usando e.values: ' + JSON.stringify(e.values));
      // e.values é um array na ordem das colunas (índice 0 = timestamp)
      payload = {
        nome: e.values[1] || '',
        cpf: e.values[2] || '',
        data_nascimento: e.values[3] || '',
        telefone: e.values[4] || '',
        email: e.values[5] || '',
        cidade: e.values[6] || '',
        estado: e.values[7] || '',
        servico_contratado: e.values[8] || '',
        observacoes: e.values[9] || ''
      };
      Logger.log('Método e.values usado com sucesso');
    }
    else {
      Logger.log('ERRO: Objeto de evento inválido. e = ' + JSON.stringify(e));
      return;
    }

    // Formatar data de nascimento para YYYY-MM-DD (Supabase DATE)
    if (payload.data_nascimento) {
      try {
        var d = new Date(payload.data_nascimento);
        if (!isNaN(d.getTime())) {
          payload.data_nascimento = d.toISOString().split('T')[0];
        }
      } catch (e) {
        Logger.log('Erro ao formatar data: ' + e);
      }
    }

    Logger.log('Payload final: ' + JSON.stringify(payload));

    // Verificar dados mínimos
    if (!payload.nome || !payload.telefone) {
      Logger.log('ERRO: Nome ou telefone vazios. Payload: ' + JSON.stringify(payload));
      return;
    }

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
  } catch (err) {
    Logger.log('ERRO GERAL: ' + err.toString());
    Logger.log('Stack: ' + err.stack);
    Logger.log('Evento recebido: ' + JSON.stringify(e));
  }
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
