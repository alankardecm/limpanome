// =============================================
// APP - Controlador principal do SPA
// =============================================

const App = {
  currentPage: 'dashboard',

  init() {
    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) this.navigate(page);
      });
    });

    // Novo cliente button
    document.getElementById('btnNovoCliente').addEventListener('click', () => {
      this.openClienteModal();
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Mobile toggle
    document.getElementById('mobileToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Global search with debounce
    const searchInput = document.getElementById('globalSearch');
    searchInput.addEventListener('input', Utils.debounce(() => {
      if (this.currentPage === 'clientes') {
        ClientesPage.loadClientes(1);
      } else if (searchInput.value.trim()) {
        this.navigate('clientes');
        setTimeout(() => ClientesPage.loadClientes(1), 100);
      }
    }, 400));

    // Enter on search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.currentPage !== 'clientes') {
          this.navigate('clientes');
          setTimeout(() => ClientesPage.loadClientes(1), 100);
        } else {
          ClientesPage.loadClientes(1);
        }
      }
    });

    // Load tarefas badge
    this.updateTarefasBadge();

    // Navigate to dashboard
    this.navigate('dashboard');
  },

  navigate(page) {
    this.currentPage = page;

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update title
    const titles = {
      dashboard: 'Dashboard',
      clientes: 'Clientes',
      processos: 'Processos',
      tarefas: 'Tarefas',
      pipeline: 'Pipeline',
      precos: 'Tabela de Preços',
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Render page
    switch (page) {
      case 'dashboard': DashboardPage.render(); break;
      case 'clientes': ClientesPage.render(); break;
      case 'processos': ProcessosPage.render(); break;
      case 'tarefas': TarefasPage.render(); break;
      case 'pipeline': PipelinePage.render(); break;
      case 'precos': PrecosPage.render(); break;
      default: DashboardPage.render();
    }
  },

  showClienteDetalhe(id) {
    this.currentPage = 'cliente-detalhe';
    document.getElementById('pageTitle').textContent = 'Detalhe do Cliente';

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === 'clientes');
    });

    ClienteDetalhePage.render(id);
  },

  // === Modal ===
  openModal(title, bodyHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalOverlay').classList.add('active');
    // Foco no primeiro input
    setTimeout(() => {
      const firstInput = document.querySelector('#modalBody input, #modalBody select, #modalBody textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
  },

  // === Modal Cliente ===
  openClienteModal(cliente = null) {
    const isEdit = !!cliente;
    const title = isEdit ? 'Editar Cliente' : 'Novo Cliente';

    this.openModal(title, `
      <div class="form-grid">
        <div class="form-group"><label>Nome Completo *</label><input id="mcNome" value="${Utils.escapeHtml(cliente?.nome || '')}" placeholder="Nome completo"></div>
        <div class="form-group"><label>CPF *</label><input id="mcCPF" value="${cliente?.cpf ? Utils.formatCPF(cliente.cpf) : ''}" placeholder="000.000.000-00" maxlength="14"></div>
        <div class="form-group"><label>RG</label><input id="mcRG" value="${Utils.escapeHtml(cliente?.rg || '')}"></div>
        <div class="form-group"><label>Data Nascimento</label><input id="mcNasc" type="date" value="${cliente?.data_nascimento || ''}"></div>
        <div class="form-group"><label>Telefone *</label><input id="mcTel" value="${Utils.escapeHtml(cliente?.telefone || '')}" placeholder="(99) 99999-9999"></div>
        <div class="form-group"><label>Telefone 2</label><input id="mcTel2" value="${Utils.escapeHtml(cliente?.telefone2 || '')}"></div>
        <div class="form-group"><label>E-mail</label><input id="mcEmail" type="email" value="${Utils.escapeHtml(cliente?.email || '')}"></div>
        <div class="form-group"><label>Estado Civil</label>
          <select id="mcEstCivil">
            <option value="">Selecione</option>
            ${['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'].map(ec =>
      `<option value="${ec}" ${cliente?.estado_civil === ec ? 'selected' : ''}>${ec}</option>`
    ).join('')}
          </select>
        </div>
        <div class="form-group"><label>Profissão</label><input id="mcProf" value="${Utils.escapeHtml(cliente?.profissao || '')}"></div>
        <div class="form-group"><label>Renda Mensal (R$)</label><input id="mcRenda" type="number" step="0.01" value="${cliente?.renda_mensal || ''}"></div>
        <div class="form-group full-width"><label>Serviços Contratados</label>
          <div class="checkbox-group" id="mcServicos">
            ${['Diagnóstico Financeiro', 'Limpa Nome (SCPC, Serasa, etc)', 'Score', 'Rating', 'BACEN'].map(s => {
      const checked = (cliente?.servico_contratado || '').split(', ').includes(s) ? 'checked' : '';
      return `<label class="checkbox-label"><input type="checkbox" value="${s}" ${checked}> ${s}</label>`;
    }).join('')}
          </div>
        </div>
        <div class="form-group"><label>Score Inicial</label><input id="mcScore" type="number" min="0" max="1000" value="${cliente?.score_inicial || ''}"></div>
        <div class="form-group"><label>Origem</label>
          <select id="mcOrigem">
            <option value="manual" ${!cliente || cliente?.origem === 'manual' ? 'selected' : ''}>Manual</option>
            <option value="forms" ${cliente?.origem === 'forms' ? 'selected' : ''}>Forms</option>
            <option value="whatsapp" ${cliente?.origem === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
          </select>
        </div>
      </div>
      <div class="form-section">
        <h4>Endereço</h4>
        <div class="form-grid">
          <div class="form-group full-width"><label>Endereço</label><input id="mcEnd" value="${Utils.escapeHtml(cliente?.endereco || '')}" placeholder="Rua, número, complemento"></div>
          <div class="form-group"><label>Cidade</label><input id="mcCidade" value="${Utils.escapeHtml(cliente?.cidade || '')}"></div>
          <div class="form-group"><label>Estado</label>
            <select id="mcEstado">
              <option value="">UF</option>
              ${['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf =>
      `<option value="${uf}" ${cliente?.estado === uf ? 'selected' : ''}>${uf}</option>`
    ).join('')}
            </select>
          </div>
          <div class="form-group"><label>CEP</label><input id="mcCEP" value="${Utils.escapeHtml(cliente?.cep || '')}" maxlength="9"></div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-group full-width"><label>Observações</label><textarea id="mcObs">${Utils.escapeHtml(cliente?.observacoes || '')}</textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.saveCliente(${isEdit ? cliente.id : 'null'})">
          <i class="fas fa-save"></i> ${isEdit ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    `);

    // Máscara CPF
    const cpfInput = document.getElementById('mcCPF');
    cpfInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      e.target.value = v;
    });

    // Máscara telefone
    const telInput = document.getElementById('mcTel');
    telInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
      else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, '($1) $2');
      e.target.value = v;
    });
  },

  async saveCliente(id) {
    const data = {
      nome: document.getElementById('mcNome').value.trim(),
      cpf: document.getElementById('mcCPF').value,
      rg: document.getElementById('mcRG').value.trim(),
      data_nascimento: document.getElementById('mcNasc').value,
      telefone: document.getElementById('mcTel').value.replace(/\D/g, ''),
      telefone2: document.getElementById('mcTel2').value.replace(/\D/g, ''),
      email: document.getElementById('mcEmail').value.trim(),
      estado_civil: document.getElementById('mcEstCivil').value,
      profissao: document.getElementById('mcProf').value.trim(),
      renda_mensal: parseFloat(document.getElementById('mcRenda').value) || null,
      servico_contratado: [...document.querySelectorAll('#mcServicos input:checked')].map(c => c.value).join(', '),
      score_inicial: parseInt(document.getElementById('mcScore').value) || null,
      origem: document.getElementById('mcOrigem').value,
      endereco: document.getElementById('mcEnd').value.trim(),
      cidade: document.getElementById('mcCidade').value.trim(),
      estado: document.getElementById('mcEstado').value,
      cep: document.getElementById('mcCEP').value.trim(),
      observacoes: document.getElementById('mcObs').value.trim(),
    };

    if (!data.nome) return this.toast('Nome é obrigatório', 'error');
    if (!data.cpf) return this.toast('CPF é obrigatório', 'error');
    if (!data.telefone) return this.toast('Telefone é obrigatório', 'error');

    try {
      if (id) {
        await API.clientes.atualizar(id, data);
        this.toast('Cliente atualizado!', 'success');
        this.closeModal();
        ClienteDetalhePage.render(id);
      } else {
        const novo = await API.clientes.criar(data);
        this.toast('Cliente cadastrado!', 'success');
        this.closeModal();
        this.showClienteDetalhe(novo.id);
      }
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  // === Toast ===
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // === Tarefas Badge ===
  async updateTarefasBadge() {
    try {
      const result = await API.tarefas.listar({ status: 'pendente' });
      const tarefas = result.data || result;
      const badge = document.getElementById('tarefasBadge');
      if (tarefas.length > 0) {
        badge.textContent = tarefas.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      // silently ignore
    }
  },
};

// App.init() é chamado por Auth.showApp() após autenticação bem-sucedida
