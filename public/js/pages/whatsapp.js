// =============================================
// WPP PAGE — Disparo em Massa via WhatsApp
// =============================================

const WhatsappPage = {
    clientes: [],
    selecionados: new Set(),
    campanhaAtiva: null,
    pollingInterval: null,

    async render() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
        <div class="wpp-page">

            <!-- Header da página -->
            <div class="wpp-header">
                <div>
                    <h2><i class="fab fa-whatsapp" style="color:#25D366"></i> Disparo em Massa — WhatsApp</h2>
                    <p class="wpp-subtitle">Selecione os leads e envie mensagens diretamente via Meta Cloud API</p>
                </div>
                <button class="btn btn-outline" onclick="WhatsappPage.renderHistorico()">
                    <i class="fas fa-history"></i> Ver Histórico
                </button>
            </div>

            <div class="wpp-grid">

                <!-- Coluna Esquerda: Seleção de Leads -->
                <div class="wpp-card">
                    <div class="wpp-card-header">
                        <h3><i class="fas fa-users"></i> Selecionar Leads</h3>
                        <div class="wpp-filtros">
                            <select id="wppFiltroStatus" onchange="WhatsappPage.filtrar()">
                                <option value="">Todos com telefone</option>
                                <option value="lead">Lead</option>
                                <option value="contato_inicial">Contato Inicial</option>
                                <option value="em_atendimento">Em Atendimento</option>
                                <option value="aguardando_documentos">Aguardando Docs</option>
                                <option value="em_analise">Em Análise</option>
                                <option value="ativo">Ativo</option>
                            </select>
                            <input type="text" id="wppBusca" placeholder="Buscar por nome..." oninput="WhatsappPage.filtrar()">
                        </div>
                    </div>

                    <div class="wpp-actions-bar">
                        <label class="wpp-check-all">
                            <input type="checkbox" id="checkAll" onchange="WhatsappPage.toggleAll(this.checked)">
                            <span>Selecionar todos visíveis</span>
                        </label>
                        <span class="wpp-badge" id="wppContador">0 selecionados</span>
                    </div>

                    <div class="wpp-leads-list" id="wppLeadsList">
                        <div class="wpp-loading"><i class="fas fa-spinner fa-spin"></i> Carregando leads...</div>
                    </div>
                </div>

                <!-- Coluna Direita: Editor de Mensagem -->
                <div class="wpp-card">
                    <div class="wpp-card-header">
                        <h3><i class="fas fa-pen-to-square"></i> Mensagem</h3>
                    </div>

                    <div class="wpp-form">
                        <div class="form-group">
                            <label>Nome da Campanha</label>
                            <input type="text" id="wppTitulo" placeholder="Ex: Promoção Limpa Nome — Março 2026">
                        </div>

                        <div class="form-group">
                            <label>Mensagem <span class="wpp-hint">Use <code>{{nome}}</code> para personalizar</span></label>
                            <textarea id="wppMensagem" rows="8" placeholder="Olá {{nome}}, tudo bem?&#10;&#10;Sou da Limpa Nome e tenho uma proposta especial para limpar seu nome no Serasa/SPC com condições facilitadas! 🎯&#10;&#10;Quer saber mais? Responda essa mensagem!" oninput="WhatsappPage.atualizarPrevia()"></textarea>
                            <div class="wpp-char-count" id="wppCharCount">0 caracteres</div>
                        </div>

                        <div class="form-group">
                            <label>Delay entre envios</label>
                            <select id="wppDelay">
                                <option value="2000">2 segundos (recomendado)</option>
                                <option value="3000">3 segundos (mais seguro)</option>
                                <option value="5000">5 segundos (conservador)</option>
                                <option value="1000">1 segundo (rápido)</option>
                            </select>
                        </div>

                        <!-- Preview -->
                        <div class="wpp-preview">
                            <div class="wpp-preview-label"><i class="fas fa-eye"></i> Prévia da mensagem</div>
                            <div class="wpp-bubble" id="wppPrevia">
                                <em style="color:#999">Escreva a mensagem ao lado para ver a prévia...</em>
                            </div>
                        </div>

                        <!-- Teste rápido -->
                        <div class="wpp-teste">
                            <input type="text" id="wppTelTeste" placeholder="Seu número para teste (ex: 19999999999)">
                            <button class="btn btn-outline btn-sm" onclick="WhatsappPage.enviarTeste()">
                                <i class="fab fa-whatsapp"></i> Testar
                            </button>
                        </div>

                        <!-- Botão Disparar -->
                        <button class="btn-disparar" id="btnDisparar" onclick="WhatsappPage.confirmarDisparo()">
                            <i class="fab fa-whatsapp"></i>
                            Disparar para <span id="wppQtd">0</span> leads
                        </button>
                    </div>
                </div>
            </div>

            <!-- Painel de progresso (oculto inicialmente) -->
            <div class="wpp-progresso-panel" id="wppProgressoPanel" style="display:none">
                <div class="wpp-progresso-header">
                    <h3><i class="fas fa-paper-plane" style="color:#25D366"></i> Disparo em andamento...</h3>
                    <span id="wppStatusLabel" class="badge badge-warning">Enviando...</span>
                </div>
                <div class="wpp-progress-bar-wrap">
                    <div class="wpp-progress-bar" id="wppProgressBar" style="width:0%"></div>
                </div>
                <div class="wpp-progresso-stats">
                    <div class="wpp-stat verde"><i class="fas fa-check"></i> <span id="statEnviados">0</span> enviados</div>
                    <div class="wpp-stat vermelho"><i class="fas fa-xmark"></i> <span id="statErros">0</span> erros</div>
                    <div class="wpp-stat cinza"><i class="fas fa-users"></i> <span id="statTotal">0</span> total</div>
                </div>
                <div class="wpp-log" id="wppLog"></div>
            </div>

        </div>`;

        this.carregarLeads();
    },

    async carregarLeads() {
        try {
            const data = await API.clientes.listar({ limit: 500 });
            this.clientes = (data.data || data || []).filter(c => c.telefone && c.telefone.replace(/\D/g, '').length >= 10);
            this.selecionados.clear();
            this.exibirLeads(this.clientes);
        } catch (err) {
            document.getElementById('wppLeadsList').innerHTML = `<div class="wpp-empty"><i class="fas fa-circle-exclamation"></i> Erro ao carregar leads: ${err.message}</div>`;
        }
    },

    filtrar() {
        const busca = (document.getElementById('wppBusca')?.value || '').toLowerCase();
        const status = document.getElementById('wppFiltroStatus')?.value || '';
        const filtrados = this.clientes.filter(c => {
            const matchBusca = !busca || c.nome?.toLowerCase().includes(busca);
            const matchStatus = !status || c.status === status;
            return matchBusca && matchStatus;
        });
        this.exibirLeads(filtrados);
    },

    exibirLeads(lista) {
        const container = document.getElementById('wppLeadsList');
        if (!lista.length) {
            container.innerHTML = '<div class="wpp-empty"><i class="fas fa-inbox"></i> Nenhum lead com telefone encontrado</div>';
            return;
        }

        const statusLabel = { lead: 'Lead', contato_inicial: 'Contato', em_atendimento: 'Atendimento', aguardando_documentos: 'Docs', em_analise: 'Análise', ativo: 'Ativo', concluido: 'Concluído', cancelado: 'Cancelado' };
        const statusColor = { lead: '#6c63ff', contato_inicial: '#3b82f6', em_atendimento: '#f59e0b', aguardando_documentos: '#ef4444', em_analise: '#8b5cf6', ativo: '#22c55e' };

        container.innerHTML = lista.map(c => `
            <label class="wpp-lead-item ${this.selecionados.has(c.id) ? 'selecionado' : ''}">
                <input type="checkbox" class="wpp-lead-check" value="${c.id}" ${this.selecionados.has(c.id) ? 'checked' : ''}
                    onchange="WhatsappPage.toggleLead(${c.id}, this.checked)">
                <div class="wpp-lead-info">
                    <span class="wpp-lead-nome">${Utils.escapeHtml(c.nome)}</span>
                    <span class="wpp-lead-tel"><i class="fas fa-phone"></i> ${Utils.escapeHtml(c.telefone)}</span>
                </div>
                <span class="wpp-lead-status" style="background:${statusColor[c.status] || '#555'}20;color:${statusColor[c.status] || '#aaa'};border:1px solid ${statusColor[c.status] || '#555'}40">
                    ${statusLabel[c.status] || c.status}
                </span>
            </label>`).join('');

        this.atualizarContador();
    },

    toggleLead(id, checked) {
        if (checked) this.selecionados.add(id);
        else this.selecionados.delete(id);
        const item = document.querySelector(`.wpp-lead-check[value="${id}"]`)?.closest('.wpp-lead-item');
        if (item) item.classList.toggle('selecionado', checked);
        this.atualizarContador();
    },

    toggleAll(checked) {
        document.querySelectorAll('.wpp-lead-check').forEach(cb => {
            const id = parseInt(cb.value);
            cb.checked = checked;
            if (checked) this.selecionados.add(id);
            else this.selecionados.delete(id);
            cb.closest('.wpp-lead-item')?.classList.toggle('selecionado', checked);
        });
        this.atualizarContador();
    },

    atualizarContador() {
        const n = this.selecionados.size;
        document.getElementById('wppContador').textContent = `${n} selecionado${n !== 1 ? 's' : ''}`;
        const el = document.getElementById('wppQtd');
        if (el) el.textContent = n;
    },

    atualizarPrevia() {
        const msg = document.getElementById('wppMensagem')?.value || '';
        const previa = msg.replace(/\{\{nome\}\}/gi, '<strong>Alan</strong>').replace(/\n/g, '<br>');
        const el = document.getElementById('wppPrevia');
        if (el) el.innerHTML = previa || '<em style="color:#999">Escreva a mensagem ao lado para ver a prévia...</em>';
        const count = document.getElementById('wppCharCount');
        if (count) count.textContent = `${msg.length} caracteres`;
    },

    async enviarTeste() {
        const tel = document.getElementById('wppTelTeste')?.value?.trim();
        const msg = document.getElementById('wppMensagem')?.value?.trim();
        if (!tel) return App.toast('Digite seu número para teste', 'warning');
        if (!msg) return App.toast('Escreva a mensagem antes de testar', 'warning');

        const msgFinal = msg.replace(/\{\{nome\}\}/gi, 'você').replace(/\{\{telefone\}\}/gi, tel);

        try {
            App.toast('Enviando mensagem de teste...', 'info');
            await API.request('/whatsapp/enviar-um', { method: 'POST', body: { telefone: tel, mensagem: msgFinal } });
            App.toast('✅ Mensagem de teste enviada! Verifique seu WhatsApp.', 'success');
        } catch (err) {
            App.toast(`Erro: ${err.message}`, 'error');
        }
    },

    confirmarDisparo() {
        const n = this.selecionados.size;
        const msg = document.getElementById('wppMensagem')?.value?.trim();
        if (n === 0) return App.toast('Selecione ao menos 1 lead', 'warning');
        if (!msg) return App.toast('Escreva a mensagem antes de disparar', 'warning');

        App.openModal('⚠️ Confirmar Disparo', `
            <div style="text-align:center;padding:1rem 0">
                <div style="font-size:3rem;margin-bottom:1rem">📤</div>
                <p style="font-size:1.1rem;margin-bottom:0.5rem">Você vai enviar mensagens para</p>
                <p style="font-size:2rem;font-weight:700;color:#25D366;margin-bottom:1rem">${n} lead${n !== 1 ? 's' : ''}</p>
                <p style="color:#aaa;font-size:0.9rem;margin-bottom:2rem">O envio acontecerá com delay de 2s entre cada mensagem para evitar bloqueios.</p>
                <div style="display:flex;gap:1rem;justify-content:center">
                    <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" style="background:linear-gradient(135deg,#25D366,#128C7E)" onclick="App.closeModal();WhatsappPage.disparar()">
                        <i class="fab fa-whatsapp"></i> Confirmar Disparo
                    </button>
                </div>
            </div>
        `);
    },

    async disparar() {
        const mensagem = document.getElementById('wppMensagem')?.value?.trim();
        const titulo = document.getElementById('wppTitulo')?.value?.trim();
        const delay_ms = parseInt(document.getElementById('wppDelay')?.value || '2000');
        const cliente_ids = [...this.selecionados];

        try {
            const result = await API.request('/whatsapp/disparar', {
                method: 'POST', body: {
                    mensagem, titulo_campanha: titulo, cliente_ids, delay_ms
                }
            });

            this.campanhaAtiva = result.campanha_id;
            this.mostrarProgresso(result.total, titulo || 'Disparo WhatsApp');
            this.iniciarPolling();

        } catch (err) {
            App.toast(`Erro ao iniciar disparo: ${err.message}`, 'error');
        }
    },

    mostrarProgresso(total, titulo) {
        const panel = document.getElementById('wppProgressoPanel');
        if (!panel) return;
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statEnviados').textContent = '0';
        document.getElementById('statErros').textContent = '0';
        document.getElementById('wppProgressBar').style.width = '0%';
        document.getElementById('wppStatusLabel').textContent = 'Enviando...';
        document.getElementById('wppStatusLabel').className = 'badge badge-warning';
        document.getElementById('wppLog').innerHTML = `<div class="wpp-log-item"><i class="fas fa-play" style="color:#25D366"></i> Campanha "<strong>${Utils.escapeHtml(titulo)}</strong>" iniciada — ${total} lead(s)</div>`;
    },

    iniciarPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(async () => {
            try {
                const data = await API.request(`/whatsapp/progresso/${this.campanhaAtiva}`);
                const { enviados = 0, erros = 0, total = 0, finalizado } = data;

                document.getElementById('statEnviados').textContent = enviados;
                document.getElementById('statErros').textContent = erros;
                const pct = total > 0 ? Math.round(((enviados + erros) / total) * 100) : 0;
                document.getElementById('wppProgressBar').style.width = pct + '%';

                if (finalizado) {
                    clearInterval(this.pollingInterval);
                    this.pollingInterval = null;
                    document.getElementById('wppStatusLabel').textContent = '✅ Concluído';
                    document.getElementById('wppStatusLabel').className = 'badge badge-success';
                    const log = document.getElementById('wppLog');
                    log.innerHTML += `<div class="wpp-log-item"><i class="fas fa-check-circle" style="color:#22c55e"></i> Disparo finalizado: <strong>${enviados} enviados</strong>, ${erros} erro(s)</div>`;
                    App.toast(`Disparo concluído! ${enviados}/${total} mensagens enviadas.`, 'success');
                }
            } catch (e) { /* silencioso */ }
        }, 3000);
    },

    async renderHistorico() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `<div style="padding:2rem"><button class="btn btn-outline" onclick="WhatsappPage.render()" style="margin-bottom:1.5rem"><i class="fas fa-arrow-left"></i> Voltar</button><div id="historicoContent"><i class="fas fa-spinner fa-spin"></i> Carregando...</div></div>`;

        try {
            const data = await API.request('/whatsapp/historico-disparos');
            const { campanhas = [] } = data;

            if (!campanhas.length) {
                document.getElementById('historicoContent').innerHTML = '<div class="wpp-empty"><i class="fab fa-whatsapp"></i> Nenhum disparo realizado ainda</div>';
                return;
            }

            document.getElementById('historicoContent').innerHTML = `
                <h2 style="margin-bottom:1.5rem"><i class="fas fa-history"></i> Histórico de Campanhas</h2>
                <div class="wpp-historico-lista">
                ${campanhas.map(c => `
                    <div class="wpp-hist-item">
                        <div class="wpp-hist-info">
                            <strong>${Utils.escapeHtml(c.titulo || 'Campanha')}</strong>
                            <span style="color:#aaa;font-size:0.82rem">${new Date(c.data).toLocaleString('pt-BR')}</span>
                        </div>
                        <div class="wpp-hist-stats">
                            <span class="wpp-stat verde"><i class="fas fa-check"></i> ${c.enviados || 0}</span>
                            <span class="wpp-stat vermelho"><i class="fas fa-xmark"></i> ${c.erros || 0}</span>
                            <span class="wpp-stat cinza"><i class="fas fa-users"></i> ${c.total || 0}</span>
                        </div>
                    </div>`).join('')}
                </div>`;
        } catch (err) {
            document.getElementById('historicoContent').innerHTML = `<div class="wpp-empty">Erro: ${err.message}</div>`;
        }
    }
};
