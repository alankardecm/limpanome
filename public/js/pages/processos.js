// =============================================
// PAGE: PROCESSOS (Lista geral)
// =============================================

const ProcessosPage = {
  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="filters-bar">
        <select class="filter-select" id="filterProcStatus" onchange="ProcessosPage.loadProcessos()">
          <option value="">Todos os Status</option>
          ${Object.entries(Utils.processoStatusLabels).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
        <div style="margin-left:auto" class="text-muted" id="processosCount"></div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0" id="processosTableContainer">
          ${Components.loading()}
        </div>
      </div>
    `;
    await this.loadProcessos();
  },

  async loadProcessos() {
    const container = document.getElementById('processosTableContainer');
    container.innerHTML = Components.loading();

    try {
      const params = {};
      const status = document.getElementById('filterProcStatus')?.value;
      if (status) params.status = status;

      const processos = await API.processos.listar(params);
      document.getElementById('processosCount').textContent = `${processos.length} processo(s)`;

      if (processos.length === 0) {
        container.innerHTML = Components.emptyState('fa-gavel', 'Nenhum processo', 'Crie um processo na página do cliente');
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Nº Processo</th>
                <th>Tipo</th>
                <th>Advogado/Plataforma</th>
                <th>Bureaus</th>
                <th>Status</th>
                <th>Protocolo</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              ${processos.map(p => {
                let bureaus = [];
                try { bureaus = JSON.parse(p.bureaus_alvo || '[]'); } catch(e) {}
                return `
                  <tr onclick="App.showClienteDetalhe(${p.cliente_id})">
                    <td>
                      <div style="font-weight:600">${Utils.escapeHtml(p.cliente_nome)}</div>
                      <div class="text-muted" style="font-size:0.75rem">${Utils.formatCPF(p.cliente_cpf)}</div>
                    </td>
                    <td style="font-family:monospace">${Utils.escapeHtml(p.numero_processo || 'S/N')}</td>
                    <td>${p.tipo}</td>
                    <td>
                      ${Utils.escapeHtml(p.advogado || '-')}
                      ${p.plataforma ? `<br><small class="text-muted">${Utils.escapeHtml(p.plataforma)}</small>` : ''}
                    </td>
                    <td>
                      <div style="display:flex;gap:3px;flex-wrap:wrap;">
                        ${bureaus.map(b => `<span class="card-tag">${Utils.bureauLabels[b] || b}</span>`).join('')}
                      </div>
                    </td>
                    <td>${Components.processoStatusBadge(p.status)}</td>
                    <td>${Utils.formatDate(p.data_protocolo)}</td>
                    <td>${Utils.formatDate(p.data_validade)}</td>
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
};
