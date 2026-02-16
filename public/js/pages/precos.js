// =============================================
// PÁGINA: Tabela de Preços
// =============================================

const PrecosPage = {
    precos: [],
    editingCell: null,

    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
      <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div>
          <h2 style="margin:0; font-size:1.1rem; color:var(--text-secondary,#94a3b8);">
            <i class="fas fa-tags"></i> Valores cobrados por serviço
          </h2>
        </div>
        <button class="btn btn-primary" onclick="PrecosPage.openNovoModal()">
          <i class="fas fa-plus"></i> Novo Serviço
        </button>
      </div>
      <div class="card" style="overflow:visible;">
        <div id="precosTableContainer" style="overflow-x:auto;">
          <p style="text-align:center; padding:40px; color:var(--text-secondary,#94a3b8);">
            <i class="fas fa-spinner fa-spin"></i> Carregando...
          </p>
        </div>
      </div>
    `;
        await this.load();
    },

    async load() {
        try {
            this.precos = await API.precos.listar();
            this.renderTable();
        } catch (err) {
            document.getElementById('precosTableContainer').innerHTML =
                `<p style="text-align:center;padding:40px;color:#ef4444;">
          <i class="fas fa-exclamation-triangle"></i> Erro ao carregar preços: ${err.message}
        </p>`;
        }
    },

    renderTable() {
        const container = document.getElementById('precosTableContainer');
        if (!this.precos || this.precos.length === 0) {
            container.innerHTML = `
        <p style="text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);">
          Nenhum serviço cadastrado.
        </p>`;
            return;
        }

        const rows = this.precos.map((p, idx) => `
      <tr style="border-bottom:1px solid var(--border,#1e293b);">
        <td style="padding:14px 16px; font-weight:600; color:var(--text-primary,#f1f5f9); white-space:nowrap;">
          ${this.escapeHtml(p.servico)}
        </td>
        <td class="preco-cell" style="padding:14px 16px; text-align:right; cursor:pointer; transition:background .2s;"
            onclick="PrecosPage.startEdit(${p.id}, 'preco_tabela', this)"
            onmouseover="this.style.background='rgba(99,102,241,0.1)'"
            onmouseout="this.style.background='transparent'"
            title="Clique para editar">
          ${this.formatPreco(p.preco_tabela)}
        </td>
        <td class="preco-cell" style="padding:14px 16px; text-align:right; cursor:pointer; transition:background .2s; color:#a78bfa;"
            onclick="PrecosPage.startEdit(${p.id}, 'preco_meekah', this)"
            onmouseover="this.style.background='rgba(167,139,250,0.1)'"
            onmouseout="this.style.background='transparent'"
            title="Clique para editar">
          ${this.formatPreco(p.preco_meekah)}
        </td>
        <td class="preco-cell" style="padding:14px 16px; text-align:right; cursor:pointer; transition:background .2s; color:#34d399;"
            onclick="PrecosPage.startEdit(${p.id}, 'preco_geral', this)"
            onmouseover="this.style.background='rgba(52,211,153,0.1)'"
            onmouseout="this.style.background='transparent'"
            title="Clique para editar">
          ${this.formatPreco(p.preco_geral)}
        </td>
        <td style="padding:14px 16px; text-align:center;">
          <button class="btn-icon" onclick="PrecosPage.excluir(${p.id}, '${this.escapeHtml(p.servico)}')"
                  title="Excluir" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.9rem;">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

        container.innerHTML = `
      <table style="width:100%; border-collapse:collapse; min-width:600px;">
        <thead>
          <tr style="border-bottom:2px solid var(--border,#1e293b);">
            <th style="padding:12px 16px; text-align:left; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary,#94a3b8); font-weight:600;">
              Serviço
            </th>
            <th style="padding:12px 16px; text-align:right; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary,#94a3b8); font-weight:600;">
              <i class="fas fa-tag" style="margin-right:4px;"></i> Preço Tabela
            </th>
            <th style="padding:12px 16px; text-align:right; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#a78bfa; font-weight:600;">
              <i class="fas fa-star" style="margin-right:4px;"></i> Clientes Meekah
            </th>
            <th style="padding:12px 16px; text-align:right; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#34d399; font-weight:600;">
              <i class="fas fa-users" style="margin-right:4px;"></i> Clientes em Geral
            </th>
            <th style="padding:12px 16px; text-align:center; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary,#94a3b8); font-weight:600; width:60px;">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="padding:12px 16px; font-size:0.75rem; color:var(--text-secondary,#64748b); margin:0;">
        <i class="fas fa-info-circle"></i> Clique em qualquer valor para editar diretamente.
      </p>
    `;
    },

    formatPreco(valor) {
        if (valor === null || valor === undefined || valor === '') {
            return '<span style="color:var(--text-secondary,#475569);">—</span>';
        }
        const num = parseFloat(valor);
        if (isNaN(num)) return '—';
        return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    startEdit(id, campo, cell) {
        // Se já está editando, cancelar
        if (this.editingCell) return;
        this.editingCell = cell;

        const preco = this.precos.find(p => p.id === id);
        const valorAtual = preco ? preco[campo] : '';
        const valorNum = valorAtual !== null && valorAtual !== undefined ? parseFloat(valorAtual) : '';

        const originalHTML = cell.innerHTML;
        const originalColor = cell.style.color;

        cell.innerHTML = `
      <input type="number" step="0.01" min="0" value="${valorNum || ''}"
        style="width:120px; padding:6px 10px; border:2px solid #6366f1; border-radius:6px;
               background:var(--bg-secondary,#1e293b); color:#f1f5f9; font-size:0.95rem;
               text-align:right; outline:none;"
        id="precosEditInput"
        onkeydown="if(event.key==='Enter') PrecosPage.saveEdit(${id},'${campo}'); if(event.key==='Escape') PrecosPage.cancelEdit();"
      />
    `;
        cell.style.cursor = 'default';
        cell.onclick = null;

        const input = document.getElementById('precosEditInput');
        input.focus();
        input.select();

        // Salvar referências para cancelar
        this._editRestore = { cell, originalHTML, originalColor, id, campo };

        // Salvar ao clicar fora
        const onBlur = () => {
            input.removeEventListener('blur', onBlur);
            // Pequeno delay para permitir Enter ser processado primeiro
            setTimeout(() => {
                if (this.editingCell === cell) {
                    this.saveEdit(id, campo);
                }
            }, 150);
        };
        input.addEventListener('blur', onBlur);
    },

    async saveEdit(id, campo) {
        const input = document.getElementById('precosEditInput');
        if (!input) { this.editingCell = null; return; }

        const valor = input.value.trim();
        const valorNum = valor === '' ? null : parseFloat(valor);

        this.editingCell = null;

        try {
            await API.precos.atualizar(id, { [campo]: valorNum });
            App.toast('Preço atualizado!', 'success');
            await this.load();
        } catch (err) {
            App.toast('Erro ao salvar: ' + err.message, 'error');
            await this.load();
        }
    },

    cancelEdit() {
        if (!this._editRestore) return;
        const { cell, originalHTML, originalColor } = this._editRestore;
        cell.innerHTML = originalHTML;
        cell.style.color = originalColor;
        cell.style.cursor = 'pointer';
        this.editingCell = null;
        this._editRestore = null;
    },

    openNovoModal() {
        const html = `
      <form id="formNovoServico" onsubmit="PrecosPage.salvarNovo(event)">
        <div class="form-group">
          <label>Nome do Serviço *</label>
          <input type="text" id="novoServico" required placeholder="Ex: Limpa Nome"
                 style="width:100%; padding:10px; border:1px solid var(--border,#334155); border-radius:8px; background:var(--bg-secondary,#1e293b); color:#f1f5f9;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:12px;">
          <div class="form-group">
            <label>Preço Tabela (R$)</label>
            <input type="number" step="0.01" min="0" id="novoPrecoTabela" placeholder="0,00"
                   style="width:100%; padding:10px; border:1px solid var(--border,#334155); border-radius:8px; background:var(--bg-secondary,#1e293b); color:#f1f5f9;">
          </div>
          <div class="form-group">
            <label style="color:#a78bfa;">Preço Meekah (R$)</label>
            <input type="number" step="0.01" min="0" id="novoPrecoMeekah" placeholder="0,00"
                   style="width:100%; padding:10px; border:1px solid var(--border,#334155); border-radius:8px; background:var(--bg-secondary,#1e293b); color:#f1f5f9;">
          </div>
          <div class="form-group">
            <label style="color:#34d399;">Preço Geral (R$)</label>
            <input type="number" step="0.01" min="0" id="novoPrecoGeral" placeholder="0,00"
                   style="width:100%; padding:10px; border:1px solid var(--border,#334155); border-radius:8px; background:var(--bg-secondary,#1e293b); color:#f1f5f9;">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn" onclick="App.closeModal()"
                  style="padding:10px 20px; border:1px solid var(--border,#334155); border-radius:8px; background:transparent; color:#94a3b8; cursor:pointer;">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" style="padding:10px 20px;">
            <i class="fas fa-save"></i> Salvar
          </button>
        </div>
      </form>
    `;
        App.openModal('Novo Serviço', html);
    },

    async salvarNovo(e) {
        e.preventDefault();
        const servico = document.getElementById('novoServico').value.trim();
        const preco_tabela = document.getElementById('novoPrecoTabela').value || null;
        const preco_meekah = document.getElementById('novoPrecoMeekah').value || null;
        const preco_geral = document.getElementById('novoPrecoGeral').value || null;

        if (!servico) {
            App.toast('Nome do serviço é obrigatório', 'error');
            return;
        }

        try {
            await API.precos.criar({
                servico,
                preco_tabela: preco_tabela ? parseFloat(preco_tabela) : null,
                preco_meekah: preco_meekah ? parseFloat(preco_meekah) : null,
                preco_geral: preco_geral ? parseFloat(preco_geral) : null,
            });
            App.closeModal();
            App.toast('Serviço adicionado!', 'success');
            await this.load();
        } catch (err) {
            App.toast('Erro ao salvar: ' + err.message, 'error');
        }
    },

    async excluir(id, nome) {
        if (!confirm(`Excluir o serviço "${nome}"?`)) return;
        try {
            await API.precos.excluir(id);
            App.toast('Serviço excluído!', 'success');
            await this.load();
        } catch (err) {
            App.toast('Erro ao excluir: ' + err.message, 'error');
        }
    }
};
