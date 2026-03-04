/* ============================================
   AMARILIS SOLUÇÕES - LEAD CAPTURE JS
   Form submission, masks, animations
   ============================================ */

// ===== CONFIGURAÇÃO =====
// URL do webhook genérico do CRM (já existe, não precisa alterar nada no CRM)
const CRM_WEBHOOK_URL = 'https://limpanome-t73d.vercel.app/api/webhook/generic';
// Número do WhatsApp (formato: 55 + DDD + número)
const WHATSAPP_NUMBER = '5515999999999'; // <-- TROCAR PELO SEU NÚMERO
// URL do webhook N8N para boas-vindas (opcional, configure após importar o workflow)
const N8N_WELCOME_WEBHOOK = ''; // <-- Cole a URL do webhook do N8N aqui quando configurar

// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('active'));
    });
}

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(7, 11, 20, 0.95)';
        navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.3)';
    } else {
        navbar.style.background = 'rgba(7, 11, 20, 0.85)';
        navbar.style.boxShadow = 'none';
    }
});

// ===== MÁSCARAS DE INPUT =====
function maskPhone(value) {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
}

function maskCPF(value) {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.substring(0, 3)}.${digits.substring(3)}`;
    if (digits.length <= 9) return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6)}`;
    return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
}

const phoneInput = document.getElementById('telefone');
const cpfInput = document.getElementById('cpf');

if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        e.target.value = maskPhone(e.target.value);
    });
}

if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
        e.target.value = maskCPF(e.target.value);
    });
}

// ===== FORMULÁRIO - ENVIO =====
const leadForm = document.getElementById('leadForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');
const whatsappLink = document.getElementById('whatsappLink');

if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        // Loading state
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        submitBtn.disabled = true;

        // Coletar dados do formulário
        const nome = document.getElementById('nome').value.trim();
        const telefone = document.getElementById('telefone').value.replace(/\D/g, '');
        const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
        const email = document.getElementById('email').value.trim();
        const servico = document.getElementById('servico').value;

        const servicoLabels = {
            limpa_nome: 'Limpa Nome (Serasa, SPC, Boa Vista)',
            protesto: 'Retirada de Protestos',
            bacen: 'Retirada de Apontamentos BACEN',
            score: 'Aumento de Score',
            rating: 'Melhoria de Rating',
            completo: 'Pacote Completo',
            nao_sei: 'Quer entender melhor'
        };

        const payload = {
            nome,
            telefone,
            cpf: cpf || null,
            email: email || null,
            origem: 'landing_page',
            servico_contratado: servicoLabels[servico] || null,
            observacoes: servico ? `Interesse em: ${servicoLabels[servico] || servico}` : null
        };

        try {
            // 1. Enviar para o webhook genérico do CRM (já existente)
            const response = await fetch(CRM_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar dados');
            }

            const result = await response.json();

            // 2. Disparar webhook N8N para boas-vindas automática (se configurado)
            if (N8N_WELCOME_WEBHOOK) {
                try {
                    await fetch(N8N_WELCOME_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nome,
                            telefone,
                            cpf: cpf || null,
                            email: email || null,
                            servico: servicoLabels[servico] || servico,
                            cliente_id: result.cliente_id || null,
                            timestamp: new Date().toISOString()
                        })
                    });
                } catch (n8nErr) {
                    // N8N pode estar offline, não deve bloquear o fluxo principal
                    console.warn('N8N webhook não disponível:', n8nErr.message);
                }
            }

            // 3. Montar link do WhatsApp
            const servicoTexto = servicoLabels[servico] ? ` Tenho interesse em: ${servicoLabels[servico]}.` : '';
            const msgWhatsapp = `Olá! Meu nome é ${nome} e acabei de preencher o formulário de Consulta Gratuita.${servicoTexto} Gostaria de saber mais sobre a blindagem do meu nome.`;
            whatsappLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msgWhatsapp)}`;

            // 4. Mostrar sucesso
            leadForm.style.display = 'none';
            formSuccess.style.display = 'block';

        } catch (err) {
            console.error('Erro no envio:', err);
            alert('Ocorreu um erro ao enviar seus dados. Por favor, tente novamente ou entre em contato pelo WhatsApp.');
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}

// ===== CONTADORES ANIMADOS =====
function animateCounter(el, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    function formatValue(val) {
        const rounded = Math.floor(val);
        if (target >= 100) return rounded + '+';
        if (target <= 12) return rounded;
        return rounded + '%';
    }

    function update() {
        start += increment;
        if (start >= target) {
            start = target;
            el.textContent = formatValue(target);
            return;
        }
        el.textContent = formatValue(start);
        requestAnimationFrame(update);
    }
    update();
}

const proofNumbers = document.querySelectorAll('.proof-number');
let countersAnimated = false;

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
            countersAnimated = true;
            proofNumbers.forEach(el => {
                const target = parseInt(el.getAttribute('data-target'));
                animateCounter(el, target);
            });
        }
    });
}, { threshold: 0.2 });

const proofBar = document.querySelector('.social-proof-bar');
if (proofBar) counterObserver.observe(proofBar);

// ===== FADE-IN ON SCROLL =====
const fadeElements = document.querySelectorAll('.feature-card, .step-card, .testimonial-card, .comparison-card, .faq-item');
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

fadeElements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.05}s, transform 0.6s ease ${i * 0.05}s`;
    fadeObserver.observe(el);
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});
