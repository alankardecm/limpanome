// =============================================
// PAGE: CLIENTE DETALHE
// =============================================

const ClienteDetalhePage = {
  clienteId: null,
  cliente: null,
  activeTab: 'geral',

  async render(id) {
    this.clienteId = id;
    const content = document.getElementById('pageContent');
    content.innerHTML = Components.loading();

    try {
      this.cliente = await API.clientes.buscar(id);
      content.innerHTML = this.buildHTML();
      this.setActiveTab('geral');
    } catch (err) {
      content.innerHTML = Components.emptyState('fa-exclamation-triangle', 'Erro', err.message);
    }
  },

  buildHTML() {
    const c = this.cliente;
    return `
      <!-- Header -->
      <div class="detail-header">
        <div class="client-info">
          <button class="btn btn-outline btn-sm" onclick="App.navigate('clientes')" style="margin-right:8px">
            <i class="fas fa-arrow-left"></i>
          </button>
          <div class="client-avatar">${Utils.getInitials(c.nome)}</div>
          <div>
            <h2>${Utils.escapeHtml(c.nome)}</h2>
            <div class="info-sub">
              <span><i class="fas fa-id-card"></i> ${Utils.formatCPF(c.cpf)}</span>
              <span><i class="fas fa-phone"></i> ${Utils.formatPhone(c.telefone)}</span>
              ${c.email ? `<span><i class="fas fa-envelope"></i> ${Utils.escapeHtml(c.email)}</span>` : ''}
              <span>${Components.statusBadge(c.status)}</span>
              <span>${Components.origemBadge(c.origem)}</span>
            </div>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-outline btn-sm" onclick="ClienteDetalhePage.editarCliente()">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="ClienteDetalhePage.excluirCliente()">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="detail-tabs">
        <button class="detail-tab active" data-tab="geral" onclick="ClienteDetalhePage.setActiveTab('geral')">
          <i class="fas fa-user"></i> Geral
        </button>
        <button class="detail-tab" data-tab="dividas" onclick="ClienteDetalhePage.setActiveTab('dividas')">
          <i class="fas fa-credit-card"></i> Dívidas (${c.dividas?.length || 0})
        </button>
        <button class="detail-tab" data-tab="processos" onclick="ClienteDetalhePage.setActiveTab('processos')">
          <i class="fas fa-gavel"></i> Processos (${c.processos?.length || 0})
        </button>
        <button class="detail-tab" data-tab="bacen" onclick="ClienteDetalhePage.setActiveTab('bacen')">
          <i class="fas fa-building-columns"></i> BACEN (${c.apontamentos_bacen?.length || 0})
        </button>
        <button class="detail-tab" data-tab="score" onclick="ClienteDetalhePage.setActiveTab('score')">
          <i class="fas fa-star"></i> Score
        </button>
        <button class="detail-tab" data-tab="historico" onclick="ClienteDetalhePage.setActiveTab('historico')">
          <i class="fas fa-clock-rotate-left"></i> Histórico
        </button>
        <button class="detail-tab" data-tab="tarefas" onclick="ClienteDetalhePage.setActiveTab('tarefas')">
          <i class="fas fa-tasks"></i> Tarefas (${c.tarefas?.length || 0})
        </button>
      </div>

      <!-- Tab Contents -->
      <div id="tabGeral" class="tab-content active">${this.buildTabGeral()}</div>
      <div id="tabDividas" class="tab-content">${this.buildTabDividas()}</div>
      <div id="tabProcessos" class="tab-content">${this.buildTabProcessos()}</div>
      <div id="tabBacen" class="tab-content">${this.buildTabBacen()}</div>
      <div id="tabScore" class="tab-content">${this.buildTabScore()}</div>
      <div id="tabHistorico" class="tab-content">${this.buildTabHistorico()}</div>
      <div id="tabTarefas" class="tab-content">${this.buildTabTarefas()}</div>
    `;
  },

  setActiveTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    const tabEl = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (tabEl) tabEl.classList.add('active');
  },

  buildTabGeral() {
    const c = this.cliente;
    return `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Dados Pessoais</h3></div>
          <div class="card-body">
            <div class="form-grid">
              ${this.infoField('Nome', c.nome)}
              ${this.infoField('CPF', Utils.formatCPF(c.cpf))}
              ${this.infoField('RG', c.rg)}
              ${this.infoField('Data de Nascimento', Utils.formatDate(c.data_nascimento))}
              ${this.infoField('Estado Civil', c.estado_civil)}
              ${this.infoField('Profissão', c.profissao)}
              ${this.infoField('Renda Mensal', c.renda_mensal ? Utils.formatMoney(c.renda_mensal) : '-')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Contato e Endereço</h3></div>
          <div class="card-body">
            <div class="form-grid">
              ${this.infoField('Telefone', Utils.formatPhone(c.telefone))}
              ${this.infoField('Telefone 2', Utils.formatPhone(c.telefone2))}
              ${this.infoField('E-mail', c.email)}
              ${this.infoField('Endereço', c.endereco)}
              ${this.infoField('Cidade', c.cidade)}
              ${this.infoField('Estado', c.estado)}
              ${this.infoField('CEP', c.cep)}
            </div>
          </div>
        </div>
      </div>
      ${c.observacoes ? `
        <div class="card mt-2">
          <div class="card-header"><h3>Observações</h3></div>
          <div class="card-body"><p>${Utils.escapeHtml(c.observacoes)}</p></div>
        </div>
      ` : ''}

      <!-- Quick Status Change -->
      <div class="card mt-2">
        <div class="card-header"><h3>Alterar Status</h3></div>
        <div class="card-body">
          <div class="btn-group">
            ${['lead', 'analise', 'em_processo', 'concluido', 'cancelado'].map(st => `
              <button class="btn btn-sm ${c.status === st ? 'btn-primary' : 'btn-outline'}" 
                onclick="ClienteDetalhePage.changeStatus('${st}')"
                ${c.status === st ? 'disabled' : ''}>
                ${Utils.statusLabels[st]}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  infoField(label, value) {
    return `
      <div class="form-group">
        <label>${label}</label>
        <div style="font-size:0.95rem;padding:4px 0;">${Utils.escapeHtml(value || '-')}</div>
      </div>
    `;
  },

  buildTabDividas() {
    const dividas = this.cliente.dividas || [];
    return `
      <div class="flex-between mb-2">
        <h3>Dívidas do Cliente</h3>
        <button class="btn btn-primary btn-sm" onclick="ClienteDetalhePage.addDivida()">
          <i class="fas fa-plus"></i> Nova Dívida
        </button>
      </div>
      ${dividas.length === 0 ? Components.emptyState('fa-credit-card', 'Sem dívidas', 'Nenhuma dívida cadastrada') : `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Credor</th>
                <th>Bureau</th>
                <th>Tipo</th>
                <th>Valor Original</th>
                <th>Valor Atualizado</th>
                <th>Negativação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${dividas.map(d => `
                <tr>
                  <td style="font-weight:600">${Utils.escapeHtml(d.credor)}</td>
                  <td>${Utils.bureauLabels[d.bureau] || d.bureau || '-'}</td>
                  <td>${Utils.tipoDividaLabels[d.tipo] || d.tipo || '-'}</td>
                  <td class="text-danger">${Utils.formatMoney(d.valor_original)}</td>
                  <td class="text-danger">${Utils.formatMoney(d.valor_atualizado)}</td>
                  <td>${Utils.formatDate(d.data_negativacao)}</td>
                  <td>${Components.statusBadge(d.status === 'ativa' ? 'cancelado' : d.status === 'liminar_ativa' ? 'deferido' : 'concluido')}</td>
                  <td>
                    <button class="btn btn-sm btn-outline btn-icon" onclick="ClienteDetalhePage.editDivida(${d.id})" title="Editar">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="ClienteDetalhePage.deleteDivida(${d.id})" title="Excluir">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer mt-2">
          <strong>Total:</strong> 
          <span class="text-danger">${Utils.formatMoney(dividas.reduce((sum, d) => sum + (d.valor_original || 0), 0))}</span>
        </div>
      `}
    `;
  },

  buildTabProcessos() {
    const processos = this.cliente.processos || [];
    return `
      <div class="flex-between mb-2">
        <h3>Processos / Liminares</h3>
        <button class="btn btn-primary btn-sm" onclick="ClienteDetalhePage.addProcesso()">
          <i class="fas fa-plus"></i> Novo Processo
        </button>
      </div>
      ${processos.length === 0 ? Components.emptyState('fa-gavel', 'Sem processos', 'Nenhum processo cadastrado') : `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nº Processo</th>
                <th>Tipo</th>
                <th>Advogado</th>
                <th>Plataforma</th>
                <th>Bureaus</th>
                <th>Status</th>
                <th>Protocolo</th>
                <th>Validade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${processos.map(p => {
                let bureaus = [];
                try { bureaus = JSON.parse(p.bureaus_alvo || '[]'); } catch(e) {}
                return `
                  <tr>
                    <td style="font-family:monospace;font-weight:600">${Utils.escapeHtml(p.numero_processo || 'S/N')}</td>
                    <td>${p.tipo || '-'}</td>
                    <td>${Utils.escapeHtml(p.advogado || '-')}</td>
                    <td>${Utils.escapeHtml(p.plataforma || '-')}</td>
                    <td>
                      <div class="pipeline-card card-tags" style="padding:0;border:0;box-shadow:none;">
                        ${bureaus.map(b => `<span class="card-tag">${Utils.bureauLabels[b] || b}</span>`).join('')}
                      </div>
                    </td>
                    <td>${Components.processoStatusBadge(p.status)}</td>
                    <td>${Utils.formatDate(p.data_protocolo)}</td>
                    <td>${Utils.formatDate(p.data_validade)}</td>
                    <td>
                      <button class="btn btn-sm btn-outline btn-icon" onclick="ClienteDetalhePage.editProcesso(${p.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-sm btn-danger btn-icon" onclick="ClienteDetalhePage.deleteProcesso(${p.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  buildTabBacen() {
    const items = this.cliente.apontamentos_bacen || [];
    return `
      <div class="flex-between mb-2">
        <h3>Apontamentos BACEN</h3>
        <button class="btn btn-primary btn-sm" onclick="ClienteDetalhePage.addBacen()">
          <i class="fas fa-plus"></i> Novo Apontamento
        </button>
      </div>
      ${items.length === 0 ? Components.emptyState('fa-building-columns', 'Sem apontamentos', 'Nenhum apontamento BACEN') : `
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Tipo</th><th>Instituição</th><th>Valor</th><th>Data</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${items.map(b => `
                <tr>
                  <td style="font-weight:600">${(b.tipo || '').toUpperCase()}</td>
                  <td>${Utils.escapeHtml(b.instituicao || '-')}</td>
                  <td class="text-danger">${Utils.formatMoney(b.valor)}</td>
                  <td>${Utils.formatDate(b.data_apontamento)}</td>
                  <td>${Components.statusBadge(b.status === 'ativo' ? 'cancelado' : b.status === 'removido' ? 'concluido' : 'analise')}</td>
                  <td>
                    <button class="btn btn-sm btn-outline btn-icon" onclick="ClienteDetalhePage.editBacen(${b.id})" title="Editar">
                      <i class="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  buildTabScore() {
    const scores = this.cliente.scores || [];
    const c = this.cliente;
    return `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Score Atual</h3></div>
          <div class="card-body" style="text-align:center">
            <div style="font-size:3rem;font-weight:700;color:${(c.score_atual || 0) >= 500 ? 'var(--accent)' : 'var(--status-cancelado)'}">
              ${c.score_atual || '---'}
            </div>
            ${c.score_inicial ? `<p class="text-muted">Score inicial: ${c.score_inicial}</p>` : ''}
            <button class="btn btn-primary btn-sm mt-2" onclick="ClienteDetalhePage.updateScore()">
              <i class="fas fa-sync"></i> Atualizar Score
            </button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Histórico de Score</h3></div>
          <div class="card-body">
            ${scores.length === 0 ? '<p class="text-muted">Nenhum registro de score</p>' : `
              <table>
                <thead>
                  <tr><th>Data</th><th>Score</th><th>Bureau</th></tr>
                </thead>
                <tbody>
                  ${scores.map(s => `
                    <tr>
                      <td>${Utils.formatDate(s.data_consulta)}</td>
                      <td style="font-weight:700;color:${s.score >= 500 ? 'var(--accent)' : 'var(--status-cancelado)'}">${s.score}</td>
                      <td>${Utils.bureauLabels[s.bureau] || s.bureau || 'Geral'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;
  },

  buildTabHistorico() {
    const historico = this.cliente.historico || [];
    return `
      <div class="flex-between mb-2">
        <h3>Histórico / Timeline</h3>
        <button class="btn btn-primary btn-sm" onclick="ClienteDetalhePage.addNota()">
          <i class="fas fa-plus"></i> Adicionar Nota
        </button>
      </div>
      ${historico.length === 0 ? Components.emptyState('fa-clock', 'Sem histórico', 'O histórico aparecerá aqui') : `
        <div class="timeline">
          ${historico.map(h => `
            <div class="timeline-item ${h.tipo}">
              <div class="timeline-date">${Utils.formatDateTime(h.data_registro)}</div>
              <div class="timeline-text">${Utils.escapeHtml(h.descricao)}</div>
              <div class="timeline-author">por ${Utils.escapeHtml(h.autor || 'sistema')}</div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  buildTabTarefas() {
    const tarefas = this.cliente.tarefas || [];
    return `
      <div class="flex-between mb-2">
        <h3>Tarefas</h3>
        <button class="btn btn-primary btn-sm" onclick="ClienteDetalhePage.addTarefa()">
          <i class="fas fa-plus"></i> Nova Tarefa
        </button>
      </div>
      ${tarefas.length === 0 ? Components.emptyState('fa-tasks', 'Sem tarefas', 'Crie uma tarefa para este cliente') : `
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Tarefa</th><th>Tipo</th><th>Prioridade</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${tarefas.map(t => `
                <tr>
                  <td style="font-weight:600">${Utils.escapeHtml(t.titulo)}</td>
                  <td>${t.tipo}</td>
                  <td>${Components.prioridadeBadge(t.prioridade)}</td>
                  <td>${Utils.formatDate(t.data_vencimento)}</td>
                  <td>${Components.statusBadge(t.status === 'pendente' ? 'lead' : t.status === 'concluida' ? 'concluido' : 'analise')}</td>
                  <td>
                    ${t.status !== 'concluida' ? `
                      <button class="btn btn-sm btn-success btn-icon" onclick="ClienteDetalhePage.completeTarefa(${t.id})" title="Concluir">
                        <i class="fas fa-check"></i>
                      </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger btn-icon" onclick="ClienteDetalhePage.deleteTarefa(${t.id})" title="Excluir">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  // === AÇÕES ===

  async changeStatus(newStatus) {
    try {
      await API.clientes.atualizar(this.clienteId, { status: newStatus });
      App.toast(`Status alterado para ${Utils.statusLabels[newStatus]}`, 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  editarCliente() {
    App.openClienteModal(this.cliente);
  },

  async excluirCliente() {
    const ok = await Components.confirm('Excluir Cliente', `Tem certeza que deseja excluir <strong>${Utils.escapeHtml(this.cliente.nome)}</strong>? Esta ação é irreversível.`);
    if (!ok) return;
    try {
      await API.clientes.excluir(this.clienteId);
      App.toast('Cliente excluído', 'success');
      App.navigate('clientes');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // --- Dívidas ---
  addDivida() {
    App.openModal('Nova Dívida', `
      <div class="form-grid">
        <div class="form-group"><label>Credor *</label><input id="mdCreedor" placeholder="Ex: Banco Itaú"></div>
        <div class="form-group"><label>Bureau</label>
          <select id="mdBureau">
            <option value="">Selecione</option>
            <option value="serasa">Serasa</option>
            <option value="spc">SPC</option>
            <option value="boa_vista">Boa Vista</option>
            <option value="bacen">BACEN</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="form-group"><label>Tipo</label>
          <select id="mdTipo">
            <option value="outro">Outro</option>
            <option value="cartao">Cartão de Crédito</option>
            <option value="emprestimo">Empréstimo</option>
            <option value="financiamento">Financiamento</option>
            <option value="cheque">Cheque</option>
            <option value="boleto">Boleto</option>
          </select>
        </div>
        <div class="form-group"><label>Valor Original (R$)</label><input id="mdValor" type="number" step="0.01"></div>
        <div class="form-group"><label>Valor Atualizado (R$)</label><input id="mdValorAtual" type="number" step="0.01"></div>
        <div class="form-group"><label>Data Negativação</label><input id="mdDataNeg" type="date"></div>
        <div class="form-group"><label>Contrato</label><input id="mdContrato"></div>
        <div class="form-group full-width"><label>Observações</label><textarea id="mdObs"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveDivida()">Salvar</button>
      </div>
    `);
  },

  async saveDivida() {
    try {
      await API.dividas.criar({
        cliente_id: this.clienteId,
        credor: document.getElementById('mdCreedor').value,
        bureau: document.getElementById('mdBureau').value,
        tipo: document.getElementById('mdTipo').value,
        valor_original: parseFloat(document.getElementById('mdValor').value) || 0,
        valor_atualizado: parseFloat(document.getElementById('mdValorAtual').value) || 0,
        data_negativacao: document.getElementById('mdDataNeg').value,
        contrato: document.getElementById('mdContrato').value,
        observacoes: document.getElementById('mdObs').value,
      });
      App.closeModal();
      App.toast('Dívida adicionada', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteDivida(id) {
    const ok = await Components.confirm('Excluir Dívida', 'Tem certeza?');
    if (!ok) return;
    try {
      await API.dividas.excluir(id);
      App.toast('Dívida excluída', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async editDivida(id) {
    const divida = this.cliente.dividas.find(d => d.id === id);
    if (!divida) return;

    App.openModal('Editar Dívida', `
      <div class="form-grid">
        <div class="form-group"><label>Credor</label><input id="mdCreedor" value="${Utils.escapeHtml(divida.credor || '')}"></div>
        <div class="form-group"><label>Bureau</label>
          <select id="mdBureau">
            <option value="">Selecione</option>
            ${['serasa','spc','boa_vista','bacen','outro'].map(b => `<option value="${b}" ${divida.bureau === b ? 'selected' : ''}>${Utils.bureauLabels[b]}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="mdStatus">
            ${['ativa','liminar_ativa','baixada','negociando'].map(s => `<option value="${s}" ${divida.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Valor Original</label><input id="mdValor" type="number" step="0.01" value="${divida.valor_original || ''}"></div>
        <div class="form-group"><label>Valor Atualizado</label><input id="mdValorAtual" type="number" step="0.01" value="${divida.valor_atualizado || ''}"></div>
        <div class="form-group"><label>Data Negativação</label><input id="mdDataNeg" type="date" value="${divida.data_negativacao || ''}"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveEditDivida(${id})">Salvar</button>
      </div>
    `);
  },

  async saveEditDivida(id) {
    try {
      await API.dividas.atualizar(id, {
        credor: document.getElementById('mdCreedor').value,
        bureau: document.getElementById('mdBureau').value,
        status: document.getElementById('mdStatus').value,
        valor_original: parseFloat(document.getElementById('mdValor').value) || 0,
        valor_atualizado: parseFloat(document.getElementById('mdValorAtual').value) || 0,
        data_negativacao: document.getElementById('mdDataNeg').value,
      });
      App.closeModal();
      App.toast('Dívida atualizada', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // --- Processos ---
  addProcesso() {
    App.openModal('Novo Processo / Liminar', `
      <div class="form-grid">
        <div class="form-group"><label>Nº Processo</label><input id="mpNumero" placeholder="0000000-00.0000.0.00.0000"></div>
        <div class="form-group"><label>Tipo</label>
          <select id="mpTipo">
            <option value="liminar">Liminar</option>
            <option value="acao">Ação</option>
            <option value="recurso">Recurso</option>
          </select>
        </div>
        <div class="form-group"><label>Advogado</label><input id="mpAdvogado"></div>
        <div class="form-group"><label>Escritório</label><input id="mpEscritorio"></div>
        <div class="form-group"><label>Plataforma Parceira</label><input id="mpPlataforma"></div>
        <div class="form-group"><label>Vara</label><input id="mpVara"></div>
        <div class="form-group"><label>Comarca</label><input id="mpComarca"></div>
        <div class="form-group"><label>Status</label>
          <select id="mpStatus">
            ${Object.entries(Utils.processoStatusLabels).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Data Protocolo</label><input id="mpDataProt" type="date"></div>
        <div class="form-group"><label>Data Deferimento</label><input id="mpDataDef" type="date"></div>
        <div class="form-group"><label>Data Validade</label><input id="mpDataVal" type="date"></div>
        <div class="form-group"><label>Valor Honorários (R$)</label><input id="mpHonorarios" type="number" step="0.01"></div>
        <div class="form-group"><label>Valor Custas (R$)</label><input id="mpCustas" type="number" step="0.01"></div>
      </div>
      <div class="form-section">
        <h4>Bureaus Alvo</h4>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${['serasa','spc','boa_vista','bacen'].map(b => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" class="mpBureau" value="${b}"> ${Utils.bureauLabels[b]}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group full-width mt-2"><label>Observações</label><textarea id="mpObs"></textarea></div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveProcesso()">Salvar</button>
      </div>
    `);
  },

  async saveProcesso() {
    const bureaus = Array.from(document.querySelectorAll('.mpBureau:checked')).map(cb => cb.value);
    try {
      await API.processos.criar({
        cliente_id: this.clienteId,
        numero_processo: document.getElementById('mpNumero').value,
        tipo: document.getElementById('mpTipo').value,
        advogado: document.getElementById('mpAdvogado').value,
        escritorio: document.getElementById('mpEscritorio').value,
        plataforma: document.getElementById('mpPlataforma').value,
        vara: document.getElementById('mpVara').value,
        comarca: document.getElementById('mpComarca').value,
        status: document.getElementById('mpStatus').value,
        bureaus_alvo: bureaus,
        data_protocolo: document.getElementById('mpDataProt').value,
        data_deferimento: document.getElementById('mpDataDef').value,
        data_validade: document.getElementById('mpDataVal').value,
        valor_honorarios: parseFloat(document.getElementById('mpHonorarios').value) || 0,
        valor_custas: parseFloat(document.getElementById('mpCustas').value) || 0,
        observacoes: document.getElementById('mpObs').value,
      });
      App.closeModal();
      App.toast('Processo criado', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async editProcesso(id) {
    const proc = this.cliente.processos.find(p => p.id === id);
    if (!proc) return;
    let bureaus = [];
    try { bureaus = JSON.parse(proc.bureaus_alvo || '[]'); } catch(e) {}

    App.openModal('Editar Processo', `
      <div class="form-grid">
        <div class="form-group"><label>Nº Processo</label><input id="mpNumero" value="${Utils.escapeHtml(proc.numero_processo || '')}"></div>
        <div class="form-group"><label>Status</label>
          <select id="mpStatus">
            ${Object.entries(Utils.processoStatusLabels).map(([k,v]) => `<option value="${k}" ${proc.status === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Advogado</label><input id="mpAdvogado" value="${Utils.escapeHtml(proc.advogado || '')}"></div>
        <div class="form-group"><label>Plataforma</label><input id="mpPlataforma" value="${Utils.escapeHtml(proc.plataforma || '')}"></div>
        <div class="form-group"><label>Data Protocolo</label><input id="mpDataProt" type="date" value="${proc.data_protocolo || ''}"></div>
        <div class="form-group"><label>Data Deferimento</label><input id="mpDataDef" type="date" value="${proc.data_deferimento || ''}"></div>
        <div class="form-group"><label>Data Validade</label><input id="mpDataVal" type="date" value="${proc.data_validade || ''}"></div>
        <div class="form-group"><label>Honorários</label><input id="mpHonorarios" type="number" step="0.01" value="${proc.valor_honorarios || ''}"></div>
      </div>
      <div class="form-section">
        <h4>Bureaus Alvo</h4>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${['serasa','spc','boa_vista','bacen'].map(b => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" class="mpBureau" value="${b}" ${bureaus.includes(b) ? 'checked' : ''}> ${Utils.bureauLabels[b]}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveEditProcesso(${id})">Salvar</button>
      </div>
    `);
  },

  async saveEditProcesso(id) {
    const bureaus = Array.from(document.querySelectorAll('.mpBureau:checked')).map(cb => cb.value);
    try {
      await API.processos.atualizar(id, {
        numero_processo: document.getElementById('mpNumero').value,
        status: document.getElementById('mpStatus').value,
        advogado: document.getElementById('mpAdvogado').value,
        plataforma: document.getElementById('mpPlataforma').value,
        data_protocolo: document.getElementById('mpDataProt').value,
        data_deferimento: document.getElementById('mpDataDef').value,
        data_validade: document.getElementById('mpDataVal').value,
        valor_honorarios: parseFloat(document.getElementById('mpHonorarios').value) || 0,
        bureaus_alvo: bureaus,
      });
      App.closeModal();
      App.toast('Processo atualizado', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteProcesso(id) {
    const ok = await Components.confirm('Excluir Processo', 'Tem certeza?');
    if (!ok) return;
    try {
      await API.processos.excluir(id);
      App.toast('Processo excluído', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // --- BACEN ---
  addBacen() {
    App.openModal('Novo Apontamento BACEN', `
      <div class="form-grid">
        <div class="form-group"><label>Tipo</label>
          <select id="mbTipo">
            <option value="ccf">CCF (Cheque sem fundo)</option>
            <option value="pefin">PEFIN</option>
            <option value="refin">REFIN</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="form-group"><label>Instituição</label><input id="mbInst" placeholder="Ex: Banco do Brasil"></div>
        <div class="form-group"><label>Valor (R$)</label><input id="mbValor" type="number" step="0.01"></div>
        <div class="form-group"><label>Data Apontamento</label><input id="mbData" type="date"></div>
        <div class="form-group full-width"><label>Observações</label><textarea id="mbObs"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveBacen()">Salvar</button>
      </div>
    `);
  },

  async saveBacen() {
    try {
      await API.bacen.criar({
        cliente_id: this.clienteId,
        tipo: document.getElementById('mbTipo').value,
        instituicao: document.getElementById('mbInst').value,
        valor: parseFloat(document.getElementById('mbValor').value) || 0,
        data_apontamento: document.getElementById('mbData').value,
        observacoes: document.getElementById('mbObs').value,
      });
      App.closeModal();
      App.toast('Apontamento BACEN adicionado', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async editBacen(id) {
    const ap = this.cliente.apontamentos_bacen.find(b => b.id === id);
    if (!ap) return;
    App.openModal('Editar Apontamento BACEN', `
      <div class="form-grid">
        <div class="form-group"><label>Status</label>
          <select id="mbStatus">
            <option value="ativo" ${ap.status === 'ativo' ? 'selected' : ''}>Ativo</option>
            <option value="em_processo" ${ap.status === 'em_processo' ? 'selected' : ''}>Em Processo</option>
            <option value="removido" ${ap.status === 'removido' ? 'selected' : ''}>Removido</option>
          </select>
        </div>
        <div class="form-group"><label>Instituição</label><input id="mbInst" value="${Utils.escapeHtml(ap.instituicao || '')}"></div>
        <div class="form-group"><label>Valor</label><input id="mbValor" type="number" step="0.01" value="${ap.valor || ''}"></div>
        <div class="form-group full-width"><label>Observações</label><textarea id="mbObs">${Utils.escapeHtml(ap.observacoes || '')}</textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveEditBacen(${id})">Salvar</button>
      </div>
    `);
  },

  async saveEditBacen(id) {
    try {
      await API.bacen.atualizar(id, {
        status: document.getElementById('mbStatus').value,
        instituicao: document.getElementById('mbInst').value,
        valor: parseFloat(document.getElementById('mbValor').value) || 0,
        observacoes: document.getElementById('mbObs').value,
      });
      App.closeModal();
      App.toast('Apontamento atualizado', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // --- Score ---
  updateScore() {
    App.openModal('Atualizar Score', `
      <div class="form-grid">
        <div class="form-group"><label>Novo Score</label><input id="msScore" type="number" min="0" max="1000" placeholder="Ex: 650"></div>
        <div class="form-group"><label>Bureau</label>
          <select id="msBureau">
            <option value="geral">Geral</option>
            <option value="serasa">Serasa</option>
            <option value="spc">SPC</option>
            <option value="boa_vista">Boa Vista</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveScore()">Salvar</button>
      </div>
    `);
  },

  async saveScore() {
    try {
      const score = parseInt(document.getElementById('msScore').value);
      if (!score || score < 0 || score > 1000) throw new Error('Score inválido');
      await API.clientes.atualizar(this.clienteId, {
        score_atual: score,
        bureau: document.getElementById('msBureau').value,
      });
      App.closeModal();
      App.toast('Score atualizado', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // --- Notas ---
  addNota() {
    App.openModal('Adicionar Nota', `
      <div class="form-group">
        <label>Descrição</label>
        <textarea id="mnDesc" rows="4" placeholder="Digite a nota..."></textarea>
      </div>
      <div class="form-group mt-1">
        <label>Autor</label>
        <input id="mnAutor" placeholder="Seu nome">
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveNota()">Salvar</button>
      </div>
    `);
  },

  async saveNota() {
    try {
      await API.historico.criar({
        cliente_id: this.clienteId,
        tipo: 'nota',
        descricao: document.getElementById('mnDesc').value,
        autor: document.getElementById('mnAutor').value || 'usuario',
      });
      App.closeModal();
      App.toast('Nota adicionada', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // --- Tarefas ---
  addTarefa() {
    App.openModal('Nova Tarefa', `
      <div class="form-grid">
        <div class="form-group full-width"><label>Título *</label><input id="mtTitulo" placeholder="Ex: Ligar para cliente"></div>
        <div class="form-group"><label>Tipo</label>
          <select id="mtTipo">
            <option value="geral">Geral</option>
            <option value="contato">Contato</option>
            <option value="documento">Documento</option>
            <option value="prazo">Prazo</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </div>
        <div class="form-group"><label>Prioridade</label>
          <select id="mtPrio">
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div class="form-group"><label>Vencimento</label><input id="mtData" type="date"></div>
        <div class="form-group"><label>Responsável</label><input id="mtResp"></div>
        <div class="form-group full-width"><label>Descrição</label><textarea id="mtDesc"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ClienteDetalhePage.saveTarefa()">Salvar</button>
      </div>
    `);
  },

  async saveTarefa() {
    try {
      await API.tarefas.criar({
        cliente_id: this.clienteId,
        titulo: document.getElementById('mtTitulo').value,
        tipo: document.getElementById('mtTipo').value,
        prioridade: document.getElementById('mtPrio').value,
        data_vencimento: document.getElementById('mtData').value,
        responsavel: document.getElementById('mtResp').value,
        descricao: document.getElementById('mtDesc').value,
      });
      App.closeModal();
      App.toast('Tarefa criada', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async completeTarefa(id) {
    try {
      await API.tarefas.atualizar(id, { status: 'concluida' });
      App.toast('Tarefa concluída', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteTarefa(id) {
    try {
      await API.tarefas.excluir(id);
      App.toast('Tarefa excluída', 'success');
      this.render(this.clienteId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },
};
