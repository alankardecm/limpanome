// =============================================
// PAGE: DASHBOARD
// =============================================

const DashboardPage = {
  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = Components.loading();

    try {
      const stats = await API.dashboard.metricas();
      content.innerHTML = this.buildHTML(stats);
    } catch (err) {
      content.innerHTML = Components.emptyState('fa-exclamation-triangle', 'Erro ao carregar', err.message);
    }
  },

  buildHTML(s) {
    const statusCount = {};
    (s.clientes_por_status || []).forEach(item => statusCount[item.status] = item.total);

    return `
      <!-- Stats Cards -->
      <div class="stats-grid">
        ${Components.statCard('fa-users', 'blue', 'Total Clientes', s.total_clientes, `+${s.novos_7dias} últimos 7 dias`)}
        ${Components.statCard('fa-gavel', 'purple', 'Processos', s.total_processos, `${s.liminares_deferidas} deferidas`)}
        ${Components.statCard('fa-star', 'yellow', 'Score Médio', Math.round(s.score_medio || 0), 'dos clientes ativos')}
        ${Components.statCard('fa-money-bill-wave', 'red', 'Total Dívidas', Utils.formatMoney(s.dividas?.valor_total || 0), `${s.dividas?.total || 0} registros`)}
        ${Components.statCard('fa-building-columns', 'teal', 'BACEN', `${s.bacen_ativos} ativos`, `${s.bacen_removidos} removidos`)}
        ${Components.statCard('fa-tasks', 'green', 'Tarefas Pendentes', s.tarefas_pendentes, s.tarefas_urgentes > 0 ? `${s.tarefas_urgentes} urgentes!` : 'nenhuma urgente')}
      </div>

      <!-- Pipeline mini + Bureaus -->
      <div class="grid-2 mb-3">
        <!-- Pipeline mini -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-filter"></i> Pipeline</h3>
          </div>
          <div class="card-body">
            ${this.buildPipelineBars(statusCount, s.total_clientes)}
          </div>
        </div>

        <!-- Dívidas por bureau -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-chart-pie"></i> Dívidas por Bureau</h3>
          </div>
          <div class="card-body">
            ${this.buildBureauList(s.dividas_por_bureau)}
          </div>
        </div>
      </div>

      <!-- Liminares expirando + Tarefas vencidas -->
      ${s.liminares_expirando?.length > 0 || s.tarefas_vencidas > 0 ? `
      <div class="card mb-3" style="border-left: 4px solid var(--status-cancelado)">
        <div class="card-header">
          <h3><i class="fas fa-exclamation-triangle text-danger"></i> Alertas</h3>
        </div>
        <div class="card-body">
          ${s.tarefas_vencidas > 0 ? `<p class="text-danger mb-1"><strong>${s.tarefas_vencidas}</strong> tarefa(s) vencida(s)!</p>` : ''}
          ${s.liminares_expirando?.length > 0 ? `
            <p class="text-warning mb-1"><strong>${s.liminares_expirando.length}</strong> liminar(es) expirando nos próximos 30 dias:</p>
            <ul style="margin-left:20px;">
              ${s.liminares_expirando.map(l => `
                <li style="margin-bottom:4px;">
                  <strong>${Utils.escapeHtml(l.cliente_nome)}</strong> - 
                  ${l.numero_processo || 'S/N'} - Expira em ${Utils.formatDate(l.data_validade)}
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <div class="grid-2">
        <!-- Últimos clientes -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-user-plus"></i> Últimos Clientes</h3>
            <button class="btn btn-sm btn-outline" onclick="App.navigate('clientes')">Ver todos</button>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-container">
              <table>
                <tbody>
                  ${(s.ultimos_clientes || []).map(c => `
                    <tr onclick="App.showClienteDetalhe(${c.id})">
                      <td>
                        <div style="font-weight:600">${Utils.escapeHtml(c.nome)}</div>
                        <div class="text-muted" style="font-size:0.8rem">${Utils.formatCPF(c.cpf)}</div>
                      </td>
                      <td>${Components.statusBadge(c.status)}</td>
                      <td>${Components.origemBadge(c.origem)}</td>
                      <td class="text-muted" style="font-size:0.8rem">${Utils.timeAgo(c.data_cadastro)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${(s.ultimos_clientes || []).length === 0 ? Components.emptyState('fa-user-plus', 'Nenhum cliente', 'Cadastre o primeiro cliente') : ''}
          </div>
        </div>

        <!-- Últimas atividades -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-clock-rotate-left"></i> Atividades Recentes</h3>
          </div>
          <div class="card-body">
            ${(s.ultimas_atividades || []).length > 0 ? `
              <div class="timeline">
                ${s.ultimas_atividades.map(h => `
                  <div class="timeline-item ${h.tipo}">
                    <div class="timeline-date">${Utils.timeAgo(h.data_registro)}</div>
                    <div class="timeline-text"><strong>${Utils.escapeHtml(h.cliente_nome)}</strong> - ${Utils.escapeHtml(h.descricao)}</div>
                    <div class="timeline-author">por ${Utils.escapeHtml(h.autor || 'sistema')}</div>
                  </div>
                `).join('')}
              </div>
            ` : Components.emptyState('fa-clock', 'Sem atividades', 'As atividades aparecerão aqui')}
          </div>
        </div>
      </div>
    `;
  },

  buildPipelineBars(statusCount, total) {
    if (total === 0) return '<p class="text-muted">Nenhum cliente cadastrado ainda.</p>';

    const statuses = ['lead', 'analise', 'em_processo', 'concluido', 'cancelado'];
    const colors = {
      lead: 'var(--status-lead)',
      analise: 'var(--status-analise)',
      em_processo: 'var(--status-processo)',
      concluido: 'var(--status-concluido)',
      cancelado: 'var(--status-cancelado)',
    };

    return statuses.map(st => {
      const count = statusCount[st] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div style="margin-bottom:12px;">
          <div class="flex-between mb-1" style="font-size:0.85rem;">
            <span>${Utils.statusLabels[st]}</span>
            <span><strong>${count}</strong> (${pct}%)</span>
          </div>
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:${colors[st]};height:100%;width:${pct}%;border-radius:4px;transition:width 0.5s;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  buildBureauList(bureaus) {
    if (!bureaus || bureaus.length === 0) return '<p class="text-muted">Nenhuma dívida cadastrada.</p>';

    return bureaus.map(b => `
      <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light);">
        <span style="font-weight:500">${Utils.bureauLabels[b.bureau] || b.bureau || 'N/A'}</span>
        <span>
          <strong>${b.total}</strong> dívida(s) - 
          <span class="text-danger">${Utils.formatMoney(b.valor)}</span>
        </span>
      </div>
    `).join('');
  },
};
