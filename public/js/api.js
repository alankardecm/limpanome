// =============================================
// API CLIENT - Comunicação com o backend
// =============================================
const API = {
  BASE: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.BASE}${endpoint}`;
    const token = localStorage.getItem('crm_token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      ...options,
    };

    // Preservar headers customizados do options
    if (options.headers) {
      config.headers = { ...config.headers, ...options.headers };
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // Se não autorizado, redirecionar para login
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        window.location.reload();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // === Clientes ===
  clientes: {
    listar(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/clientes${query ? '?' + query : ''}`);
    },
    buscar(id) {
      return API.request(`/clientes/${id}`);
    },
    criar(data) {
      return API.request('/clientes', { method: 'POST', body: data });
    },
    atualizar(id, data) {
      return API.request(`/clientes/${id}`, { method: 'PUT', body: data });
    },
    excluir(id) {
      return API.request(`/clientes/${id}`, { method: 'DELETE' });
    },
  },

  // === Dívidas ===
  dividas: {
    listar(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/dividas${query ? '?' + query : ''}`);
    },
    criar(data) {
      return API.request('/dividas', { method: 'POST', body: data });
    },
    atualizar(id, data) {
      return API.request(`/dividas/${id}`, { method: 'PUT', body: data });
    },
    excluir(id) {
      return API.request(`/dividas/${id}`, { method: 'DELETE' });
    },
  },

  // === Processos ===
  processos: {
    listar(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/processos${query ? '?' + query : ''}`);
    },
    buscar(id) {
      return API.request(`/processos/${id}`);
    },
    criar(data) {
      return API.request('/processos', { method: 'POST', body: data });
    },
    atualizar(id, data) {
      return API.request(`/processos/${id}`, { method: 'PUT', body: data });
    },
    excluir(id) {
      return API.request(`/processos/${id}`, { method: 'DELETE' });
    },
  },

  // === BACEN ===
  bacen: {
    listar(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/bacen${query ? '?' + query : ''}`);
    },
    criar(data) {
      return API.request('/bacen', { method: 'POST', body: data });
    },
    atualizar(id, data) {
      return API.request(`/bacen/${id}`, { method: 'PUT', body: data });
    },
    excluir(id) {
      return API.request(`/bacen/${id}`, { method: 'DELETE' });
    },
  },

  // === Histórico ===
  historico: {
    listar(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/historico${query ? '?' + query : ''}`);
    },
    criar(data) {
      return API.request('/historico', { method: 'POST', body: data });
    },
  },

  // === Tarefas ===
  tarefas: {
    listar(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/tarefas${query ? '?' + query : ''}`);
    },
    criar(data) {
      return API.request('/tarefas', { method: 'POST', body: data });
    },
    atualizar(id, data) {
      return API.request(`/tarefas/${id}`, { method: 'PUT', body: data });
    },
    excluir(id) {
      return API.request(`/tarefas/${id}`, { method: 'DELETE' });
    },
  },

  // === Dashboard ===
  dashboard: {
    metricas() {
      return API.request('/dashboard');
    },
  },

  // === Documentos ===
  documentos: {
    listar(clienteId) {
      return API.request(`/documentos?cliente_id=${clienteId}`);
    },
    async upload(clienteId, arquivo, tipo, descricao) {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('cliente_id', clienteId);
      formData.append('tipo', tipo || 'geral');
      if (descricao) formData.append('descricao', descricao);

      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API.BASE}/documentos/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('crm_token');
        window.location.reload();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      return data;
    },
    excluir(id) {
      return API.request(`/documentos/${id}`, { method: 'DELETE' });
    },
  },
};
