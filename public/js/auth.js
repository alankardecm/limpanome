// =============================================
// AUTH - Controle de autenticação
// =============================================

const Auth = {
  TOKEN_KEY: 'crm_token',
  USER_KEY: 'crm_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  // Verifica se está autenticado e decide o que mostrar
  async init() {
    const token = this.getToken();
    if (!token) {
      this.showLogin();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Token inválido');
      const data = await res.json();
      this.setSession(token, data.user);
      this.showApp();
    } catch {
      this.clearSession();
      this.showLogin();
    }
  },

  showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('loginEmail').focus();
  },

  showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sidebar').style.display = '';
    document.getElementById('mainContent').style.display = '';

    // Mostrar nome do usuário
    const user = this.getUser();
    const el = document.getElementById('userDisplay');
    if (el && user) {
      el.textContent = user.email.split('@')[0];
    }

    // Inicializar app
    App.init();
  },

  async login() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const senha = document.getElementById('loginSenha').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    errEl.textContent = '';

    if (!email || !senha) {
      errEl.textContent = 'Preencha e-mail e senha.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.error || 'Erro ao fazer login.';
        return;
      }

      this.setSession(data.token, data.user);
      this.showApp();
    } catch (err) {
      errEl.textContent = 'Erro de conexão. Tente novamente.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  },

  logout() {
    this.clearSession();
    // Recarregar a página para limpar estado
    window.location.reload();
  },
};

// Enter para fazer login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginSenha')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') Auth.login();
  });
  document.getElementById('loginEmail')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginSenha').focus();
  });
});
