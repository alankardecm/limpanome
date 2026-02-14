// =============================================
// PAGE: CLIENTES (Lista)
// =============================================

const ClientesPage = {
  currentPage: 1,
  currentStatus: '',
  currentOrigem: '',

  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="filters-bar">
        <select class="filter-select" id="filterStatus" onchange="ClientesPage.filterChanged()">
          <option value="">Todos os Status</option>
          <option value="lead">Lead</option>
          <option value="analise">Em Análise</option>
          <option value="em_processo">Em Processo</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select class="filter-select" id="filterOrigem" onchange="ClientesPage.filterChanged()">
          <option value="">Todas as Origens</option>
          <option value="manual">Manual</option>
          <option value="forms">Forms</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <div style="margin-left:auto" class="text-muted" id="clientesCount"></div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0" id="clientesTableContainer">
          ${Components.loading()}
        </div>
      </div>
      <div id="clientesPagination"></div>
    `;

    await this.loadClientes();
  },

  async loadClientes(page = 1) {
    const container = document.getElementById('clientesTableContainer');
    container.innerHTML = Components.loading();

    try {
      const params = { page, limit: 30 };
      if (this.currentStatus) params.status = this.currentStatus;
      if (this.currentOrigem) params.origem = this.currentOrigem;

      // Pega busca global
      const searchInput = document.getElementById('globalSearch');
      if (searchInput && searchInput.value.trim()) {
        params.busca = searchInput.value.trim();
      }

      const result = await API.clientes.listar(params);
      this.currentPage = result.pagination.page;

      document.getElementById('clientesCount').textContent = `${result.pagination.total} cliente(s)`;

      if (result.data.length === 0) {
        container.innerHTML = Components.emptyState('fa-users', 'Nenhum cliente encontrado', 'Tente ajustar os filtros ou cadastre um novo cliente');
        document.getElementById('clientesPagination').innerHTML = '';
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Origem</th>
                <th>Dívidas</th>
                <th>Processos</th>
                <th>Score</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              ${result.data.map(c => `
                <tr onclick="App.showClienteDetalhe(${c.id})">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="client-avatar" style="width:32px;height:32px;font-size:0.8rem;">${Utils.getInitials(c.nome)}</div>
                      <div>
                        <div style="font-weight:600">${Utils.escapeHtml(c.nome)}</div>
                        ${c.email ? `<div class="text-muted" style="font-size:0.75rem">${Utils.escapeHtml(c.email)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td style="font-family:monospace">${Utils.formatCPF(c.cpf)}</td>
                  <td>${Utils.formatPhone(c.telefone)}</td>
                  <td>${Components.statusBadge(c.status)}</td>
                  <td>${Components.origemBadge(c.origem)}</td>
                  <td>
                    <span class="${c.total_dividas > 0 ? 'text-danger' : ''}">${c.total_dividas}</span>
                    ${c.valor_total_dividas > 0 ? `<br><small class="text-muted">${Utils.formatMoney(c.valor_total_dividas)}</small>` : ''}
                  </td>
                  <td>${c.total_processos}</td>
                  <td>${c.score_atual || '-'}</td>
                  <td class="text-muted" style="font-size:0.8rem">${Utils.formatDate(c.data_cadastro)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Pagination
      this.buildPagination(result.pagination);

    } catch (err) {
      container.innerHTML = Components.emptyState('fa-exclamation-triangle', 'Erro', err.message);
    }
  },

  buildPagination(p) {
    const container = document.getElementById('clientesPagination');
    if (p.pages <= 1) { container.innerHTML = ''; return; }

    let html = '<div class="pagination">';
    html += `<button ${p.page === 1 ? 'disabled' : ''} onclick="ClientesPage.loadClientes(${p.page - 1})"><i class="fas fa-chevron-left"></i></button>`;

    for (let i = 1; i <= p.pages; i++) {
      if (i === 1 || i === p.pages || (i >= p.page - 2 && i <= p.page + 2)) {
        html += `<button class="${i === p.page ? 'active' : ''}" onclick="ClientesPage.loadClientes(${i})">${i}</button>`;
      } else if (i === p.page - 3 || i === p.page + 3) {
        html += `<button disabled>...</button>`;
      }
    }

    html += `<button ${p.page === p.pages ? 'disabled' : ''} onclick="ClientesPage.loadClientes(${p.page + 1})"><i class="fas fa-chevron-right"></i></button>`;
    html += '</div>';
    container.innerHTML = html;
  },

  filterChanged() {
    this.currentStatus = document.getElementById('filterStatus').value;
    this.currentOrigem = document.getElementById('filterOrigem').value;
    this.loadClientes(1);
  },
};
