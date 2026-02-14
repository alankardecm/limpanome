// =============================================
// COMPONENTS - Componentes reutilizáveis
// =============================================

const Components = {
  // Status badge
  statusBadge(status) {
    const label = Utils.statusLabels[status] || status;
    return `<span class="status-badge ${status}">${Utils.escapeHtml(label)}</span>`;
  },

  // Processo status badge
  processoStatusBadge(status) {
    const label = Utils.processoStatusLabels[status] || status;
    return `<span class="status-badge ${status}">${Utils.escapeHtml(label)}</span>`;
  },

  // Origem badge
  origemBadge(origem) {
    const label = Utils.origemLabels[origem] || origem;
    const icon = Utils.origemIcons[origem] || 'fa-circle';
    const brandPrefix = origem === 'whatsapp' ? 'fab' : 'fas';
    return `<span class="origem-badge ${origem}"><i class="${brandPrefix} ${icon}"></i> ${Utils.escapeHtml(label)}</span>`;
  },

  // Prioridade badge
  prioridadeBadge(prio) {
    const label = Utils.prioridadeLabels[prio] || prio;
    return `<span class="prio-badge ${prio}">${Utils.escapeHtml(label)}</span>`;
  },

  // Empty state
  emptyState(icon, title, text) {
    return `
      <div class="empty-state">
        <i class="fas ${icon}"></i>
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
    `;
  },

  // Loading
  loading() {
    return `<div class="loading"></div>`;
  },

  // Stat card
  statCard(icon, color, title, value, sub = '') {
    return `
      <div class="stat-card">
        <div class="stat-icon ${color}">
          <i class="fas ${icon}"></i>
        </div>
        <div class="stat-info">
          <h4>${title}</h4>
          <div class="stat-value">${value}</div>
          ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
        </div>
      </div>
    `;
  },

  // Confirm dialog
  async confirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modalOverlay');
      const modal = document.getElementById('modal');
      const modalTitle = document.getElementById('modalTitle');
      const modalBody = document.getElementById('modalBody');

      modalTitle.textContent = title;
      modalBody.innerHTML = `
        <p style="margin-bottom:20px">${message}</p>
        <div class="form-actions">
          <button class="btn btn-outline" id="confirmNo">Cancelar</button>
          <button class="btn btn-danger" id="confirmYes">Confirmar</button>
        </div>
      `;

      overlay.classList.add('active');

      document.getElementById('confirmYes').onclick = () => {
        overlay.classList.remove('active');
        resolve(true);
      };
      document.getElementById('confirmNo').onclick = () => {
        overlay.classList.remove('active');
        resolve(false);
      };
    });
  },
};
