// =============================================
// PAGE: PIPELINE (Kanban)
// =============================================

const PipelinePage = {
  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = Components.loading();

    try {
      const result = await API.clientes.listar({ limit: 500 });
      const clientes = result.data;

      const columns = [
        { key: 'lead', label: 'Leads', icon: 'fa-user-plus', color: 'var(--status-lead)' },
        { key: 'analise', label: 'Em Análise', icon: 'fa-magnifying-glass', color: 'var(--status-analise)' },
        { key: 'em_processo', label: 'Em Processo', icon: 'fa-gavel', color: 'var(--status-processo)' },
        { key: 'concluido', label: 'Concluído', icon: 'fa-circle-check', color: 'var(--status-concluido)' },
        { key: 'cancelado', label: 'Cancelado', icon: 'fa-circle-xmark', color: 'var(--status-cancelado)' },
      ];

      const grouped = {};
      columns.forEach(col => grouped[col.key] = []);
      clientes.forEach(c => {
        if (grouped[c.status]) grouped[c.status].push(c);
        else grouped['lead'].push(c);
      });

      content.innerHTML = `
        <div class="pipeline-board">
          ${columns.map(col => `
            <div class="pipeline-column">
              <div class="pipeline-column-header">
                <h4>
                  <i class="fas ${col.icon}" style="color:${col.color}"></i>
                  ${col.label}
                </h4>
                <span class="count">${grouped[col.key].length}</span>
              </div>
              <div class="pipeline-cards">
                ${grouped[col.key].length === 0 ? '<p class="text-muted" style="text-align:center;padding:20px;font-size:0.8rem;">Nenhum cliente</p>' : ''}
                ${grouped[col.key].map(c => `
                  <div class="pipeline-card" onclick="App.showClienteDetalhe(${c.id})">
                    <div class="card-name">${Utils.escapeHtml(c.nome)}</div>
                    <div class="card-cpf">${Utils.formatCPF(c.cpf)} | ${Utils.formatPhone(c.telefone)}</div>
                    ${c.total_dividas > 0 ? `
                      <div class="card-dividas">
                        <i class="fas fa-credit-card"></i> ${c.total_dividas} dívida(s) - ${Utils.formatMoney(c.valor_total_dividas)}
                      </div>
                    ` : ''}
                    ${c.total_processos > 0 ? `
                      <div style="font-size:0.75rem;color:var(--primary);margin-top:3px;">
                        <i class="fas fa-gavel"></i> ${c.total_processos} processo(s)
                      </div>
                    ` : ''}
                    <div class="card-tags">
                      ${Components.origemBadge(c.origem)}
                      ${c.score_atual ? `<span class="card-tag" style="background:${c.score_atual >= 500 ? '#d1fae5' : '#fee2e2'};color:${c.score_atual >= 500 ? '#059669' : '#dc2626'}">Score: ${c.score_atual}</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      content.innerHTML = Components.emptyState('fa-exclamation-triangle', 'Erro', err.message);
    }
  },
};
