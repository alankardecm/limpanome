// =============================================
// UTILS - Funções utilitárias
// =============================================

const Utils = {
  // Formata CPF: 000.000.000-00
  formatCPF(cpf) {
    if (!cpf) return '-';
    const c = cpf.replace(/\D/g, '').padStart(11, '0');
    return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9,11)}`;
  },

  // Formata telefone
  formatPhone(phone) {
    if (!phone) return '-';
    const p = phone.replace(/\D/g, '');
    if (p.length === 11) return `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}`;
    if (p.length === 10) return `(${p.slice(0,2)}) ${p.slice(2,6)}-${p.slice(6)}`;
    return phone;
  },

  // Formata moeda BRL
  formatMoney(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  },

  // Formata data
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  },

  // Formata data e hora
  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR');
  },

  // Data relativa
  timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
    return Utils.formatDate(dateStr);
  },

  // Labels de status do cliente
  statusLabels: {
    lead: 'Lead',
    analise: 'Em Análise',
    em_processo: 'Em Processo',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  },

  // Labels de status do processo
  processoStatusLabels: {
    preparando: 'Preparando',
    protocolado: 'Protocolado',
    deferido: 'Deferido',
    indeferido: 'Indeferido',
    cumprido: 'Cumprido',
    arquivado: 'Arquivado',
  },

  // Labels de origem
  origemLabels: {
    manual: 'Manual',
    forms: 'Forms',
    whatsapp: 'WhatsApp',
    webhook: 'Webhook',
  },

  origemIcons: {
    manual: 'fa-keyboard',
    forms: 'fa-file-lines',
    whatsapp: 'fa-whatsapp',
    webhook: 'fa-plug',
  },

  // Labels bureau
  bureauLabels: {
    serasa: 'Serasa',
    spc: 'SPC',
    boa_vista: 'Boa Vista',
    bacen: 'BACEN',
    outro: 'Outro',
  },

  // Labels tipo dívida
  tipoDividaLabels: {
    cartao: 'Cartão de Crédito',
    emprestimo: 'Empréstimo',
    financiamento: 'Financiamento',
    cheque: 'Cheque',
    boleto: 'Boleto',
    outro: 'Outro',
  },

  // Labels prioridade
  prioridadeLabels: {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    urgente: 'Urgente',
  },

  // Gera iniciais do nome
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  },

  // Valida CPF básico
  isValidCPF(cpf) {
    const c = cpf.replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(c[i - 1]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(c[9])) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(c[i - 1]) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(c[10]);
  },

  // Escapa HTML
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },
};
