// =============================================
// IA SDR — Painel de Conversas da IA
// =============================================

const IaSdrPage = {
  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando conversas da IA...</div>';

    try {
      const data = await API.request('/ia-sdr/conversas');
      const conversas = data.conversas || [];

      content.innerHTML = `
        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:1.5rem;">
          <div class="stat-card">
            <div class="stat-value">${conversas.length}</div>
            <div class="stat-label">Conversas Ativas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${conversas.reduce((s, c) => s + c.total_msgs, 0)}</div>
            <div class="stat-label">Total de Mensagens</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--success);">${conversas.filter(c => c.status === 'em_atendimento').length}</div>
            <div class="stat-label">Escalados p/ Humano</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:350px 1fr;gap:1rem;min-height:500px;" id="sdrLayout">
          <!-- Lista de conversas -->
          <div class="card" style="overflow:auto;max-height:600px;">
            <div class="card-header"><h3>💬 Conversas</h3></div>
            <div id="sdrConversasList">
              ${conversas.length === 0 ? '<div class="empty-state" style="padding:2rem;"><p>Nenhuma conversa ainda.<br>A IA SDR começará a conversar quando leads enviarem mensagens.</p></div>' : ''}
              ${conversas.map(c => `
                <div class="sdr-conversa-item" onclick="IaSdrPage.showConversa(${c.cliente_id})" style="padding:0.75rem 1rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s;" 
                     onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''" id="sdr-item-${c.cliente_id}">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong style="font-size:0.95rem;">${Utils.escapeHtml(c.nome)}</strong>
                    <span class="badge ${c.status === 'em_atendimento' ? 'badge-warning' : ''}" style="font-size:0.7rem;">${c.status}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;margin-top:0.25rem;">
                    <span style="font-size:0.8rem;color:var(--text-muted);">${c.telefone || ''}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);">${c.total_msgs} msgs</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Área de conversa -->
          <div class="card" id="sdrConversaArea">
            <div class="card-header" id="sdrConversaHeader">
              <h3>Selecione uma conversa</h3>
            </div>
            <div id="sdrMensagens" style="padding:1rem;min-height:400px;max-height:450px;overflow-y:auto;display:flex;flex-direction:column;gap:0.5rem;">
              <div class="empty-state"><p>Clique em uma conversa para ver o histórico.</p></div>
            </div>
            <div id="sdrActions" style="padding:0.75rem 1rem;border-top:1px solid var(--border);display:none;">
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="IaSdrPage.toggleIA()" id="btnToggleIA">
                  <i class="fas fa-robot"></i> <span id="toggleIALabel">Desativar IA</span>
                </button>
                <button class="btn btn-outline btn-sm" onclick="IaSdrPage.verCliente()">
                  <i class="fas fa-user"></i> Ver no CRM
                </button>
                <button class="btn btn-primary btn-sm" onclick="IaSdrPage.testarResposta()">
                  <i class="fas fa-paper-plane"></i> Testar Resposta
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="error">Erro ao carregar: ${err.message}</div>`;
    }
  },

  currentClienteId: null,

  async showConversa(clienteId) {
    this.currentClienteId = clienteId;

    // Highlight item
    document.querySelectorAll('.sdr-conversa-item').forEach(el => el.style.background = '');
    const item = document.getElementById(`sdr-item-${clienteId}`);
    if (item) item.style.background = 'var(--bg-secondary)';

    const header = document.getElementById('sdrConversaHeader');
    const container = document.getElementById('sdrMensagens');
    const actions = document.getElementById('sdrActions');

    header.innerHTML = '<h3><i class="fas fa-spinner fa-spin"></i> Carregando...</h3>';
    container.innerHTML = '';

    try {
      const data = await API.request(`/ia-sdr/conversa/${clienteId}`);
      const mensagens = data.mensagens || [];

      const nome = item ? item.querySelector('strong').textContent : 'Lead';
      header.innerHTML = `<h3>💬 ${Utils.escapeHtml(nome)}</h3>`;

      container.innerHTML = mensagens.map(m => `
        <div style="display:flex;justify-content:${m.remetente === 'ia' ? 'flex-end' : 'flex-start'};">
          <div style="max-width:75%;padding:0.75rem 1rem;border-radius:12px;font-size:0.9rem;line-height:1.4;
            background:${m.remetente === 'ia' ? 'var(--primary)' : 'var(--bg-tertiary)'};
            color:${m.remetente === 'ia' ? 'white' : 'var(--text-primary)'};
            border-bottom-${m.remetente === 'ia' ? 'right' : 'left'}-radius:4px;">
            <div>${Utils.escapeHtml(m.texto)}</div>
            <div style="font-size:0.7rem;margin-top:0.3rem;opacity:0.7;text-align:right;">
              ${m.remetente === 'ia' ? '🤖 IA' : '👤 Lead'} • ${new Date(m.timestamp).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      `).join('');

      // Scroll to bottom
      container.scrollTop = container.scrollHeight;
      actions.style.display = 'block';
    } catch (err) {
      container.innerHTML = `<div class="error">Erro: ${err.message}</div>`;
    }
  },

  async toggleIA() {
    if (!this.currentClienteId) return;
    try {
      // Toggle - simplified, always toggles current state
      const label = document.getElementById('toggleIALabel');
      const isActive = label.textContent.includes('Desativar');

      await API.request('/ia-sdr/toggle', {
        method: 'POST',
        body: JSON.stringify({ cliente_id: this.currentClienteId, ativa: !isActive })
      });

      label.textContent = isActive ? 'Ativar IA' : 'Desativar IA';
      App.toast(isActive ? 'IA desativada para este lead' : 'IA reativada!', 'success');
    } catch (err) {
      App.toast('Erro: ' + err.message, 'error');
    }
  },

  verCliente() {
    if (this.currentClienteId) App.showClienteDetalhe(this.currentClienteId);
  },

  async testarResposta() {
    if (!this.currentClienteId) return;
    const msg = prompt('Mensagem de teste (simula recebimento do lead):');
    if (!msg) return;

    try {
      const data = await API.request('/ia-sdr/webhook', {
        method: 'POST',
        body: JSON.stringify({ telefone: 'teste', mensagem: msg, nome: 'Teste' })
      });

      App.toast('Resposta IA: ' + data.resposta, 'info');
      this.showConversa(this.currentClienteId);
    } catch (err) {
      App.toast('Erro: ' + err.message, 'error');
    }
  }
};
