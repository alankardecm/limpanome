// =============================================
// API CLIENT - Comunicação com o backend
// =============================================
const API = {
  BASE: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.BASE}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
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
};
