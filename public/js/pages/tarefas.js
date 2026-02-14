// =============================================
// PAGE: TAREFAS
// =============================================

const TarefasPage = {
  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="filters-bar">
        <select class="filter-select" id="filterTarefaStatus" onchange="TarefasPage.loadTarefas()">
          <option value="">Todos os Status</option>
          <option value="pendente" selected>Pendentes</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluida">Concluídas</option>
          <option value="cancelada">Canceladas</option>
        </select>
        <select class="filter-select" id="filterTarefaPrio" onchange="TarefasPage.loadTarefas()">
          <option value="">Todas as Prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="TarefasPage.addTarefa()">
          <i class="fas fa-plus"></i> Nova Tarefa
        </button>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0" id="tarefasContainer">
          ${Components.loading()}
        </div>
      </div>
    `;
    await this.loadTarefas();
  },

  async loadTarefas() {
    const container = document.getElementById('tarefasContainer');
    container.innerHTML = Components.loading();

    try {
      const params = {};
      const status = document.getElementById('filterTarefaStatus')?.value;
      const prio = document.getElementById('filterTarefaPrio')?.value;
      if (status) params.status = status;
      if (prio) params.prioridade = prio;

      const result = await API.tarefas.listar(params);
      const tarefas = result.data || result;

      if (!tarefas || tarefas.length === 0) {
        container.innerHTML = Components.emptyState('fa-tasks', 'Nenhuma tarefa', 'Crie uma nova tarefa');
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Tarefa</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Prioridade</th>
                <th>Vencimento</th>
                <th>Responsável</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${tarefas.map(t => {
                const isVencida = t.data_vencimento && new Date(t.data_vencimento) < new Date() && t.status !== 'concluida';
                return `
                  <tr style="${isVencida ? 'background:#fff5f5;' : ''}">
                    <td>
                      <input type="checkbox" ${t.status === 'concluida' ? 'checked disabled' : ''} 
                        onchange="TarefasPage.toggleTarefa(${t.id}, this.checked)"
                        style="width:18px;height:18px;cursor:pointer;">
                    </td>
                    <td>
                      <div style="font-weight:600;${t.status === 'concluida' ? 'text-decoration:line-through;opacity:0.5;' : ''}">${Utils.escapeHtml(t.titulo)}</div>
                      ${t.descricao ? `<div class="text-muted" style="font-size:0.75rem">${Utils.escapeHtml(t.descricao).substring(0, 60)}</div>` : ''}
                    </td>
                    <td>
                      ${t.cliente_nome ? `<a href="#" onclick="App.showClienteDetalhe(${t.cliente_id});return false;" style="color:var(--primary);font-weight:500;">${Utils.escapeHtml(t.cliente_nome)}</a>` : '-'}
                    </td>
                    <td>${t.tipo}</td>
                    <td>${Components.prioridadeBadge(t.prioridade)}</td>
                    <td class="${isVencida ? 'text-danger' : ''}" style="font-weight:${isVencida ? '600' : 'normal'}">
                      ${Utils.formatDate(t.data_vencimento)}
                      ${isVencida ? ' <i class="fas fa-exclamation-circle"></i>' : ''}
                    </td>
                    <td>${Utils.escapeHtml(t.responsavel || '-')}</td>
                    <td>
                      <button class="btn btn-sm btn-danger btn-icon" onclick="TarefasPage.deleteTarefa(${t.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = Components.emptyState('fa-exclamation-triangle', 'Erro', err.message);
    }
  },

  async toggleTarefa(id, checked) {
    try {
      await API.tarefas.atualizar(id, { status: checked ? 'concluida' : 'pendente' });
      App.toast(checked ? 'Tarefa concluída!' : 'Tarefa reaberta', 'success');
      this.loadTarefas();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteTarefa(id) {
    const ok = await Components.confirm('Excluir Tarefa', 'Tem certeza?');
    if (!ok) return;
    try {
      await API.tarefas.excluir(id);
      App.toast('Tarefa excluída', 'success');
      this.loadTarefas();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

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
        <button class="btn btn-primary" onclick="TarefasPage.saveTarefa()">Salvar</button>
      </div>
    `);
  },

  async saveTarefa() {
    try {
      await API.tarefas.criar({
        titulo: document.getElementById('mtTitulo').value,
        tipo: document.getElementById('mtTipo').value,
        prioridade: document.getElementById('mtPrio').value,
        data_vencimento: document.getElementById('mtData').value,
        responsavel: document.getElementById('mtResp').value,
        descricao: document.getElementById('mtDesc').value,
      });
      App.closeModal();
      App.toast('Tarefa criada', 'success');
      this.loadTarefas();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },
};
