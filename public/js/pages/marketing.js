// =============================================
// MARKETING & CRIATIVOS — Página do Agente de Criativos
// =============================================

const MarketingPage = {
  // Estado local da página
  state: {
    generatedImage: null,
    generatedCaption: '',
    isGenerating: false,
    isPublishing: false,
  },

  async render() {
    const content = document.getElementById('pageContent');
    
    // Recupera ID do Instagram salvo localmente para facilitar o uso
    const savedInstaId = localStorage.getItem('crm_insta_biz_id') || '';

    content.innerHTML = `
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-icon purple">
            <i class="fas fa-magic"></i>
          </div>
          <div class="stat-info">
            <h4>Geração de Posts</h4>
            <div class="stat-value">OpenAI</div>
            <div class="stat-sub">GPT-4o-mini + DALL-E 3</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <i class="fab fa-instagram"></i>
          </div>
          <div class="stat-info">
            <h4>Publicação Direta</h4>
            <div class="stat-value">Instagram</div>
            <div class="stat-sub">Via Meta Graph API</div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; min-height: 600px;" id="marketingLayout">
        
        <!-- Formulário de Configuração -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div class="card-header">
            <h3><i class="fas fa-sliders"></i> Configuração do Criativo</h3>
          </div>
          
          <div class="card-body" style="display: flex; flex-direction: column; gap: 1.25rem; flex: 1;">
            <div class="form-group">
              <label for="mkTopic">Tema Principal</label>
              <select id="mkTopic">
                <option value="score">⭐ Aumento de Score</option>
                <option value="limpar_nome">🧹 Limpa Nome (Injunção Judicial)</option>
                <option value="bacen">🏦 BACEN (Registrato / SCR)</option>
                <option value="blindagem">🛡️ Blindagem de Nome (Serasa/SPC)</option>
                <option value="dicas">💡 Organização & Dicas Financeiras</option>
              </select>
            </div>

            <div class="form-group">
              <label for="mkTone">Tom de Voz</label>
              <select id="mkTone">
                <option value="Persuasivo">Persuasivo (Foco em conversão e dor do lead)</option>
                <option value="Educativo">Educativo (Explicativo e instrutivo)</option>
                <option value="Urgente/Alerta">Urgente/Alerta (Foco no perigo dos juros altos)</option>
                <option value="Inspiracional">Inspiracional (Foco em superação e recomeço)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="mkCustomFocus">Foco Adicional (Opcional)</label>
              <textarea id="mkCustomFocus" placeholder="Ex: Mencionar que limpamos o nome antes do pagamento do serviço completo, ou dar foco em empresários (PJ)..." style="min-height: 70px;"></textarea>
            </div>

            <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 1rem;">
              <label for="mkInstaId">Instagram Business Account ID</label>
              <input type="text" id="mkInstaId" value="${savedInstaId}" placeholder="ID da Conta Comercial no Meta (obrigatório para postar)">
              <small style="color: var(--text-light); margin-top: 0.25rem;">
                Deixe em branco para usar o padrão do servidor, ou insira um ID específico para salvar localmente.
              </small>
            </div>
          </div>

          <div class="card-footer" style="background: var(--border-light);">
            <button class="btn btn-primary" id="btnGerarCriativo" onclick="MarketingPage.gerarCriativo()" style="width: 100%; justify-content: center; height: 42px;">
              <i class="fas fa-magic"></i> Gerar Criativo com IA
            </button>
          </div>
        </div>

        <!-- Mockup do Instagram (Pré-visualização) -->
        <div class="card" style="display: flex; flex-direction: column;">
          <div class="card-header">
            <h3><i class="fab fa-instagram"></i> Pré-visualização do Post</h3>
          </div>
          
          <div class="card-body" style="background: var(--bg); display: flex; justify-content: center; align-items: center; padding: 1.5rem; flex: 1;">
            
            <!-- Card Estilo Instagram -->
            <div id="instaMockup" style="width: 100%; max-width: 380px; background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-md);">
              
              <!-- Instagram Header -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-shield-halved" style="font-size: 0.9rem;"></i>
                  </div>
                  <div>
                    <strong style="font-size: 0.85rem; display: block; line-height: 1.2;">amarilis.solucoes</strong>
                    <span style="font-size: 0.75rem; color: var(--text-light);">Parceiro Limpa Nome</span>
                  </div>
                </div>
                <i class="fas fa-ellipsis"></i>
              </div>

              <!-- Instagram Image Container -->
              <div id="instaImageContainer" style="width: 100%; aspect-ratio: 1; background: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-y: 1px solid var(--border);">
                <div id="instaImagePlaceholder" style="text-align: center; padding: 2rem; color: var(--text-light);">
                  <i class="fas fa-image" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 0.75rem; display: block;"></i>
                  <span style="font-size: 0.85rem;">Selecione as opções ao lado e clique em "Gerar Criativo"</span>
                </div>
                <img id="instaImage" src="" alt="Criativo Gerado" style="width: 100%; height: 100%; object-fit: cover; display: none;">
              </div>

              <!-- Instagram Actions -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; font-size: 1.2rem; color: var(--secondary);">
                <div style="display: flex; gap: 14px;">
                  <i class="far fa-heart" style="cursor: pointer;"></i>
                  <i class="far fa-comment" style="cursor: pointer;"></i>
                  <i class="far fa-paper-plane" style="cursor: pointer;"></i>
                </div>
                <i class="far fa-bookmark" style="cursor: pointer;"></i>
              </div>

              <!-- Instagram Caption -->
              <div style="padding: 0 14px 14px 14px; font-size: 0.85rem; line-height: 1.45;">
                <span style="font-weight: 600; margin-right: 6px;">amarilis.solucoes</span>
                <span id="instaCaptionText" style="color: var(--text);">O texto da legenda gerada pela IA aparecerá aqui.</span>
              </div>
            </div>

          </div>

          <!-- Ações de Edição e Publicação -->
          <div class="card-footer" style="display: flex; flex-direction: column; gap: 0.75rem; border-top: 1px solid var(--border);">
            <div id="editorLegenda" style="display: none; flex-direction: column; gap: 0.4rem;">
              <label for="mkCaptionEdit" style="font-size: 0.8rem; font-weight: 600; color: var(--text-light); text-transform: uppercase;">Editar Legenda</label>
              <textarea id="mkCaptionEdit" style="min-height: 100px; font-size: 0.9rem; padding: 8px;" oninput="MarketingPage.sincronizarLegenda()"></textarea>
            </div>
            
            <button class="btn btn-success" id="btnPublicarInstagram" onclick="MarketingPage.publicarInstagram()" style="width: 100%; justify-content: center; height: 42px;" disabled>
              <i class="fab fa-instagram"></i> Publicar no Instagram
            </button>
          </div>
        </div>

      </div>
    `;
  },

  async gerarCriativo() {
    if (this.state.isGenerating) return;

    const topic = document.getElementById('mkTopic').value;
    const tone = document.getElementById('mkTone').value;
    const customFocus = document.getElementById('mkCustomFocus').value.trim();
    const btn = document.getElementById('btnGerarCriativo');

    this.state.isGenerating = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando imagem e texto com IA...';

    // Reset preview
    document.getElementById('instaImagePlaceholder').style.display = 'block';
    document.getElementById('instaImage').style.display = 'none';
    document.getElementById('instaCaptionText').innerHTML = '<span style="color:var(--text-light); font-style:italic;">Gerando legenda...</span>';
    document.getElementById('editorLegenda').style.display = 'none';
    document.getElementById('btnPublicarInstagram').disabled = true;

    try {
      const payload = { 
        topic, 
        tone: customFocus ? `${tone} (Foco: ${customFocus})` : tone 
      };

      const data = await API.request('/marketing/gerar', {
        method: 'POST',
        body: payload
      });

      this.state.generatedImage = data.imageUrl;
      this.state.generatedCaption = data.caption;

      // Atualizar mockup
      const img = document.getElementById('instaImage');
      img.src = data.imageUrl;
      img.style.display = 'block';
      document.getElementById('instaImagePlaceholder').style.display = 'none';

      // Atualizar texto e editor
      const captionText = document.getElementById('instaCaptionText');
      captionText.innerHTML = data.caption.replace(/\n/g, '<br>');

      const editArea = document.getElementById('mkCaptionEdit');
      editArea.value = data.caption;
      document.getElementById('editorLegenda').style.display = 'flex';

      // Habilitar botão de publicação
      document.getElementById('btnPublicarInstagram').disabled = false;
      App.toast('Criativo gerado com sucesso!', 'success');

    } catch (err) {
      console.error(err);
      App.toast('Erro na geração: ' + err.message, 'error');
      document.getElementById('instaCaptionText').textContent = 'Erro ao gerar o criativo.';
    } finally {
      this.state.isGenerating = false;
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-magic"></i> Gerar Criativo com IA';
    }
  },

  sincronizarLegenda() {
    const editVal = document.getElementById('mkCaptionEdit').value;
    this.state.generatedCaption = editVal;
    document.getElementById('instaCaptionText').innerHTML = editVal.replace(/\n/g, '<br>');
  },

  async publicarInstagram() {
    if (this.state.isPublishing || !this.state.generatedImage) return;

    const instaIdInput = document.getElementById('mkInstaId').value.trim();
    if (instaIdInput) {
      localStorage.setItem('crm_insta_biz_id', instaIdInput);
    }

    if (!confirm('Deseja publicar este criativo no seu perfil oficial do Instagram agora?')) return;

    const btn = document.getElementById('btnPublicarInstagram');
    this.state.isPublishing = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando no Instagram...';

    try {
      const payload = {
        imageUrl: this.state.generatedImage,
        caption: this.state.generatedCaption,
        instagramBusinessAccountId: instaIdInput || undefined
      };

      const data = await API.request('/marketing/publicar', {
        method: 'POST',
        body: payload
      });

      App.toast('Sucesso! Criativo publicado no Instagram.', 'success');
      
      // Resetar estado
      this.state.generatedImage = null;
      this.state.generatedCaption = '';
      document.getElementById('btnPublicarInstagram').disabled = true;
      document.getElementById('editorLegenda').style.display = 'none';
      document.getElementById('instaImagePlaceholder').style.display = 'block';
      document.getElementById('instaImage').style.display = 'none';
      document.getElementById('instaCaptionText').textContent = 'Publicado com sucesso!';

    } catch (err) {
      console.error(err);
      App.toast('Erro ao publicar: ' + err.message, 'error');
    } finally {
      this.state.isPublishing = false;
      btn.disabled = false;
      btn.innerHTML = '<i class="fab fa-instagram"></i> Publicar no Instagram';
    }
  }
};
