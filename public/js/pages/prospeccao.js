// =============================================
// PROSPECÇÃO — Alertas, Funil, Extrator de Maps
// =============================================

const ProspeccaoPage = {
  async render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="tabs-nav" style="margin-bottom:1.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-primary tab-btn active" onclick="ProspeccaoPage.showTab('alertas')" id="tabAlertas">
          <i class="fas fa-bell"></i> Alertas
        </button>
        <button class="btn btn-outline tab-btn" onclick="ProspeccaoPage.showTab('funil')" id="tabFunil">
          <i class="fas fa-filter"></i> Funil
        </button>
        <button class="btn btn-outline tab-btn" onclick="ProspeccaoPage.showTab('extrator')" id="tabExtrator">
          <i class="fas fa-map-marker-alt"></i> Extrator Maps
        </button>
      </div>
      <div id="tabContent"></div>
    `;
    this.showTab('alertas');
  },

  showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active', 'btn-primary');
      b.classList.add('btn-outline');
    });
    const activeBtn = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (activeBtn) {
      activeBtn.classList.add('active', 'btn-primary');
      activeBtn.classList.remove('btn-outline');
    }

    switch (tab) {
      case 'alertas': this.renderAlertas(); break;
      case 'funil': this.renderFunil(); break;
      case 'extrator': this.renderExtrator(); break;
    }
  },

  // === ALERTAS ===
  async renderAlertas() {
    const container = document.getElementById('tabContent');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando alertas...</div>';

    try {
      const [alertasRes, prazosRes] = await Promise.all([
        API.request('/prospeccao/alertas'),
        API.request('/prospeccao/prazos')
      ]);

      const { alertas } = alertasRes;
      const { tarefas } = prazosRes;

      const vermelhos = alertas.filter(a => a.alerta.nivel === 'vermelho').length;
      const amarelos = alertas.filter(a => a.alerta.nivel === 'amarelo').length;
      const tarefasVencidas = (tarefas || []).filter(t => t.nivel === 'vermelho').length;

      container.innerHTML = `
        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
          <div class="stat-card" style="border-left:4px solid var(--danger);">
            <div class="stat-value" style="color:var(--danger);">${vermelhos}</div>
            <div class="stat-label">🔴 Urgentes</div>
          </div>
          <div class="stat-card" style="border-left:4px solid var(--warning);">
            <div class="stat-value" style="color:var(--warning);">${amarelos}</div>
            <div class="stat-label">🟡 Atenção</div>
          </div>
          <div class="stat-card" style="border-left:4px solid var(--danger);">
            <div class="stat-value" style="color:var(--danger);">${tarefasVencidas}</div>
            <div class="stat-label">📅 Tarefas Vencidas</div>
          </div>
          <div class="stat-card" style="border-left:4px solid var(--primary);">
            <div class="stat-value">${alertas.length}</div>
            <div class="stat-label">Total Alertas</div>
          </div>
        </div>

        ${alertas.length === 0 ? '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success);font-size:2rem;"></i><p>Nenhum alerta! Todos os leads estão em dia. 🎉</p></div>' : `
        <div class="card" style="margin-top:1rem;">
          <div class="card-header"><h3>Leads que precisam de atenção</h3></div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Alerta</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${alertas.map(a => `
                  <tr>
                    <td><span class="badge ${a.alerta.nivel === 'vermelho' ? 'badge-danger' : 'badge-warning'}">${a.alerta.nivel === 'vermelho' ? '🔴' : '🟡'}</span></td>
                    <td><a href="#" onclick="App.showClienteDetalhe(${a.id})" class="link">${Utils.escapeHtml(a.nome)}</a></td>
                    <td>${Utils.escapeHtml(a.telefone || '-')}</td>
                    <td><span class="badge">${a.status}</span></td>
                    <td style="font-size:0.85rem;">${a.alerta.msg}</td>
                    <td style="font-size:0.85rem;">${a.alerta.acao}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>`}

        ${(tarefas || []).length > 0 ? `
        <div class="card" style="margin-top:1rem;">
          <div class="card-header"><h3>📅 Tarefas com Prazo</h3></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Nível</th><th>Tarefa</th><th>Cliente</th><th>Prazo</th><th>Dias</th></tr></thead>
              <tbody>
                ${tarefas.map(t => `
                  <tr>
                    <td><span class="badge ${t.nivel === 'vermelho' ? 'badge-danger' : t.nivel === 'amarelo' ? 'badge-warning' : ''}">${t.nivel === 'vermelho' ? '🔴' : t.nivel === 'amarelo' ? '🟡' : '🟢'}</span></td>
                    <td>${Utils.escapeHtml(t.titulo)}</td>
                    <td>${t.clientes ? Utils.escapeHtml(t.clientes.nome) : '-'}</td>
                    <td>${t.data_vencimento ? new Date(t.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                    <td style="font-weight:600;color:${t.nivel === 'vermelho' ? 'var(--danger)' : t.nivel === 'amarelo' ? 'var(--warning)' : 'var(--success)'}">
                      ${t.diasRestantes < 0 ? `${Math.abs(t.diasRestantes)}d atrás` : `${t.diasRestantes}d`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
      `;
    } catch (err) {
      container.innerHTML = `<div class="error">Erro: ${err.message}</div>`;
    }
  },

  // === FUNIL ===
  async renderFunil() {
    const container = document.getElementById('tabContent');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando funil...</div>';

    try {
      const data = await API.request('/prospeccao/funil');

      container.innerHTML = `
        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));">
          <div class="stat-card"><div class="stat-value">${data.total}</div><div class="stat-label">Total</div></div>
          <div class="stat-card"><div class="stat-value">${data.novos7d}</div><div class="stat-label">Novos (7 dias)</div></div>
          <div class="stat-card"><div class="stat-value">${data.novos30d}</div><div class="stat-label">Novos (30 dias)</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--success);">${data.taxaConversao}%</div><div class="stat-label">Taxa Conversão</div></div>
        </div>

        <div class="card" style="margin-top:1rem;">
          <div class="card-header"><h3>Funil de Vendas</h3></div>
          <div class="card-body" style="padding:1.5rem;">
            ${this.renderFunilBars(data.funil, data.total)}
          </div>
        </div>

        <div class="card" style="margin-top:1rem;">
          <div class="card-header"><h3>Leads por Origem</h3></div>
          <div class="card-body" style="padding:1.5rem;">
            ${this.renderOrigensChart(data.origens, data.total)}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="error">Erro: ${err.message}</div>`;
    }
  },

  renderFunilBars(funil, total) {
    const etapas = [
      { key: 'lead', label: '📥 Lead', cor: 'var(--primary)' },
      { key: 'contato', label: '📞 Contato', cor: '#3b82f6' },
      { key: 'negociacao', label: '📋 Negociação', cor: '#f59e0b' },
      { key: 'cliente', label: '✅ Cliente', cor: 'var(--success)' },
      { key: 'perdido', label: '❌ Perdido', cor: 'var(--danger)' }
    ];

    return etapas.map(e => {
      const qtd = funil[e.key] || 0;
      const pct = total > 0 ? ((qtd / total) * 100).toFixed(0) : 0;
      return `
        <div style="margin-bottom:1rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;">
            <span style="font-weight:600;">${e.label}</span>
            <span>${qtd} (${pct}%)</span>
          </div>
          <div style="background:var(--bg-tertiary);border-radius:8px;height:24px;overflow:hidden;">
            <div style="background:${e.cor};height:100%;width:${pct}%;border-radius:8px;transition:width 0.5s;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderOrigensChart(origens, total) {
    const labels = { manual: '✏️ Manual', google_forms: '📝 Google Forms', landing_page: '🌐 Landing Page', whatsapp: '📱 WhatsApp', google_maps: '🗺️ Google Maps', instagram: '📷 Instagram' };

    return Object.entries(origens).map(([k, v]) => {
      const pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
          <span style="min-width:140px;font-size:0.9rem;">${labels[k] || k}</span>
          <div style="flex:1;background:var(--bg-tertiary);border-radius:8px;height:20px;overflow:hidden;">
            <div style="background:var(--primary);height:100%;width:${pct}%;border-radius:8px;"></div>
          </div>
          <span style="min-width:60px;text-align:right;font-weight:600;">${v} (${pct}%)</span>
        </div>
      `;
    }).join('');
  },

  // === EXTRATOR DE GOOGLE MAPS ===
  resultadosMaps: [],

  renderExtrator() {
    const container = document.getElementById('tabContent');
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>🗺️ Extrator de Leads — Google Maps</h3></div>
        <div class="card-body" style="padding:1.5rem;">
          <p style="margin-bottom:1rem;color:var(--text-secondary);font-size:0.9rem;">
            Busque empresas no Google Maps e salve como leads no CRM.
            Exemplos: "contabilidade Sorocaba", "escritório advocacia São Paulo".
          </p>
          <div class="form-grid" style="grid-template-columns:1fr 1fr auto;">
            <div class="form-group">
              <label>Palavra-chave *</label>
              <input id="mapsQuery" placeholder="Ex: contabilidade, advocacia, financeira..." value="">
            </div>
            <div class="form-group">
              <label>Cidade</label>
              <input id="mapsCidade" placeholder="Ex: Sorocaba" value="">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;">
              <button class="btn btn-primary" onclick="ProspeccaoPage.buscarMaps()" id="btnBuscarMaps">
                <i class="fas fa-search"></i> Buscar
              </button>
            </div>
          </div>
          <div id="mapsResultados"></div>
        </div>
      </div>
    `;
  },

  async buscarMaps() {
    const query = document.getElementById('mapsQuery').value.trim();
    const cidade = document.getElementById('mapsCidade').value.trim();
    const container = document.getElementById('mapsResultados');
    const btn = document.getElementById('btnBuscarMaps');

    if (!query) return App.toast('Digite uma palavra-chave', 'warning');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Buscando no Google Maps...</div>';

    try {
      const data = await API.request('/prospeccao/buscar-maps', {
        method: 'POST',
        body: JSON.stringify({ query, cidade })
      });

      this.resultadosMaps = data.resultados;

      if (!data.resultados.length) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum resultado encontrado. Tente outra busca.</p></div>';
        return;
      }

      // Buscar detalhes (telefone/website) para cada resultado
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin:1rem 0;flex-wrap:wrap;gap:.5rem">
          <span><strong>${data.total}</strong> resultados encontrados</span>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="ProspeccaoPage.selecionarTodos()"><i class="fas fa-check-double"></i> Selecionar Todos</button>
            <button class="btn btn-primary btn-sm" onclick="ProspeccaoPage.salvarSelecionados()"><i class="fas fa-save"></i> Salvar como Leads</button>
            <button class="btn btn-sm" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;" onclick="ProspeccaoPage.dispararWppSelecionados()">
              <i class="fab fa-whatsapp"></i> Disparar WPP
            </button>
            <button class="btn btn-outline btn-sm" onclick="ProspeccaoPage.exportarCSV()"><i class="fas fa-download"></i> CSV</button>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" id="checkAll" onchange="ProspeccaoPage.toggleAll(this)"></th>
                <th>Nome</th>
                <th>Endereço</th>
                <th>Rating</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="mapsTableBody">
              ${data.resultados.map((r, i) => `
                <tr>
                  <td><input type="checkbox" class="maps-check" data-index="${i}"></td>
                  <td style="font-weight:600;">${Utils.escapeHtml(r.nome)}</td>
                  <td style="font-size:0.85rem;">${Utils.escapeHtml(r.endereco || '-')}</td>
                  <td>${r.rating ? `⭐ ${r.rating} (${r.total_avaliacoes})` : '-'}</td>
                  <td id="tel-${i}"><button class="btn btn-outline btn-sm" onclick="ProspeccaoPage.buscarDetalhe(${i})"><i class="fas fa-phone"></i> Buscar</button></td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="ProspeccaoPage.salvarUm(${i})" title="Salvar como lead">
                      <i class="fas fa-user-plus"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="error" style="padding:1rem;color:var(--danger);">
        <i class="fas fa-exclamation-triangle"></i> ${err.message}
      </div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search"></i> Buscar';
    }
  },

  async buscarDetalhe(index) {
    const r = this.resultadosMaps[index];
    const telCell = document.getElementById(`tel-${index}`);
    telCell.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const detalhe = await API.request('/prospeccao/detalhe-maps', {
        method: 'POST',
        body: JSON.stringify({ place_id: r.place_id })
      });

      r.telefone = detalhe.telefone;
      r.website = detalhe.website;

      telCell.innerHTML = detalhe.telefone
        ? `<a href="https://wa.me/55${detalhe.telefone.replace(/\D/g, '')}" target="_blank" class="link">${detalhe.telefone}</a>`
        : '<span style="color:var(--text-muted);">N/A</span>';
    } catch (err) {
      telCell.innerHTML = '<span style="color:var(--danger);">Erro</span>';
    }
  },

  toggleAll(checkbox) {
    document.querySelectorAll('.maps-check').forEach(c => c.checked = checkbox.checked);
  },

  selecionarTodos() {
    document.querySelectorAll('.maps-check').forEach(c => c.checked = true);
    document.getElementById('checkAll').checked = true;
  },

  async salvarSelecionados() {
    const selecionados = [];
    document.querySelectorAll('.maps-check:checked').forEach(c => {
      const r = this.resultadosMaps[parseInt(c.dataset.index)];
      if (r) selecionados.push({ nome: r.nome, telefone: r.telefone || '', endereco: r.endereco, observacoes: `Rating: ${r.rating || 'N/A'}, Avaliações: ${r.total_avaliacoes || 0}` });
    });

    if (!selecionados.length) return App.toast('Selecione ao menos um contato', 'warning');

    try {
      const result = await API.request('/prospeccao/salvar-leads', {
        method: 'POST',
        body: JSON.stringify({ contatos: selecionados })
      });

      App.toast(`${result.criados} leads criados, ${result.duplicados} duplicados`, 'success');
    } catch (err) {
      App.toast('Erro: ' + err.message, 'error');
    }
  },

  async salvarUm(index) {
    const r = this.resultadosMaps[index];
    try {
      const result = await API.request('/prospeccao/salvar-leads', {
        method: 'POST',
        body: JSON.stringify({ contatos: [{ nome: r.nome, telefone: r.telefone || '', endereco: r.endereco }] })
      });
      App.toast(result.criados > 0 ? `${r.nome} salvo como lead!` : 'Lead já existe (duplicado)', result.criados > 0 ? 'success' : 'warning');
    } catch (err) {
      App.toast('Erro: ' + err.message, 'error');
    }
  },

  exportarCSV() {
    const linhas = ['Nome;Endereço;Rating;Telefone'];
    for (const r of this.resultadosMaps) {
      linhas.push(`"${r.nome}";"${r.endereco || ''}";"${r.rating || ''}";"${r.telefone || ''}"`);
    }
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_maps_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('CSV exportado!', 'success');
  },

  // === DISPARAR WPP DA PROSPECÇÃO ===
  dispararWppSelecionados() {
    const selecionados = [];
    document.querySelectorAll('.maps-check:checked').forEach(c => {
      const r = this.resultadosMaps[parseInt(c.dataset.index)];
      if (r && r.telefone) selecionados.push({ nome: r.nome, telefone: r.telefone });
    });

    if (!selecionados.length) {
      return App.toast('Selecione leads com telefone buscado. Use o botão 📞 Buscar primeiro!', 'warning');
    }

    const n = selecionados.length;
    App.openModal('📱 Disparar WPP — Prospecção', `
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div style="background:#d1fae5;border-radius:8px;padding:.75rem 1rem;font-size:.9rem">
          <i class="fab fa-whatsapp" style="color:#25D366"></i>
          <strong>${n} lead${n !== 1 ? 's' : ''}</strong> selecionado${n !== 1 ? 's' : ''} com telefone
        </div>

        <div class="form-group">
          <label>Mensagem <span style="font-weight:400;color:#888;font-size:.8rem">— use <code style="background:#f1f5f9;padding:1px 4px;border-radius:3px">{{nome}}</code> para personalizar</span></label>
          <textarea id="wppMapsMsg" rows="6" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;resize:vertical;font:inherit"
            placeholder="Olá {{nome}}, tudo bem?&#10;&#10;Sou da Limpa Nome e tenho uma proposta especial..."
            oninput="document.getElementById('wppMapsPrevia').innerHTML=this.value.replace(/{{nome}}/gi,'<strong>${selecionados[0]?.nome?.split(' ')[0] || 'cliente'}</strong>').replace(/\n/g,'<br>')">
          </textarea>
        </div>

        <div style="background:#e5ddd5;border-radius:8px;padding:.75rem">
          <div style="font-size:.72rem;font-weight:600;color:#555;margin-bottom:.4rem;"><i class="fas fa-eye"></i> Prévia</div>
          <div id="wppMapsPrevia" style="background:#fff;border-radius:0 10px 10px 10px;padding:.6rem .9rem;font-size:.88rem;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.1)">
            <em style="color:#aaa">Escreva a mensagem acima...</em>
          </div>
        </div>

        <div class="form-group">
          <label>Delay entre envios</label>
          <select id="wppMapsDelay" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit">
            <option value="3000">3 segundos (recomendado)</option>
            <option value="5000">5 segundos (conservador)</option>
            <option value="2000">2 segundos (rápido)</option>
          </select>
        </div>

        <div id="wppMapsProgresso" style="display:none">
          <div style="height:8px;background:#f1f5f9;border-radius:8px;overflow:hidden;margin-bottom:.5rem">
            <div id="wppMapsBar" style="height:100%;background:linear-gradient(90deg,#25D366,#128C7E);width:0%;transition:width .5s;border-radius:8px"></div>
          </div>
          <div style="display:flex;gap:.75rem;font-size:.85rem">
            <span id="wppMapsEnv" style="color:#065f46;font-weight:600"><i class="fas fa-check"></i> 0 enviados</span>
            <span id="wppMapsErr" style="color:#991b1b;font-weight:600"><i class="fas fa-xmark"></i> 0 erros</span>
            <span id="wppMapsStatus" style="color:#555">Aguardando...</span>
          </div>
        </div>

        <div style="display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem;border-top:1px solid #f1f5f9">
          <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
          <button id="btnDispararMaps" class="btn" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff"
            onclick="ProspeccaoPage._confirmarDisparo(${JSON.stringify(selecionados).replace(/"/g, '&quot;')})">
            <i class="fab fa-whatsapp"></i> Disparar para ${n} leads
          </button>
        </div>
      </div>
    `);
  },

  async _confirmarDisparo(selecionados) {
    const mensagem = document.getElementById('wppMapsMsg')?.value?.trim();
    const delay_ms = parseInt(document.getElementById('wppMapsDelay')?.value || '3000');
    if (!mensagem) return App.toast('Escreva a mensagem antes de disparar', 'warning');

    const btn = document.getElementById('btnDispararMaps');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Disparando...'; }

    const progresso = document.getElementById('wppMapsProgresso');
    if (progresso) progresso.style.display = 'block';

    try {
      const result = await API.request('/whatsapp/disparar-numeros', {
        method: 'POST',
        body: { mensagem, contatos: selecionados, delay_ms, titulo_campanha: `Prospecção Maps — ${new Date().toLocaleDateString('pt-BR')}` }
      });

      const campanhaId = result.campanha_id;
      const total = result.total;

      // Polling de progresso
      const poll = setInterval(async () => {
        try {
          const prog = await API.request(`/whatsapp/progresso/${campanhaId}`);
          const { enviados = 0, erros = 0, finalizado } = prog;
          const pct = total > 0 ? Math.round(((enviados + erros) / total) * 100) : 0;

          const bar = document.getElementById('wppMapsBar');
          const envEl = document.getElementById('wppMapsEnv');
          const errEl = document.getElementById('wppMapsErr');
          const statusEl = document.getElementById('wppMapsStatus');

          if (bar) bar.style.width = pct + '%';
          if (envEl) envEl.innerHTML = `<i class="fas fa-check"></i> ${enviados} enviados`;
          if (errEl) errEl.innerHTML = `<i class="fas fa-xmark"></i> ${erros} erros`;

          if (finalizado) {
            clearInterval(poll);
            if (statusEl) statusEl.innerHTML = '✅ Concluído!';
            App.toast(`Disparo concluído! ${enviados}/${total} mensagens enviadas.`, 'success');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Concluído'; }
          } else {
            if (statusEl) statusEl.textContent = `${pct}% concluído...`;
          }
        } catch (e) { /* silencioso */ }
      }, 3000);

    } catch (err) {
      App.toast('Erro: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fab fa-whatsapp"></i> Tentar novamente'; }
    }
  }
};

