const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Emails permitidos e senha do CRM
const ALLOWED_EMAILS = [
  'alankardecm@gmail.com',
  'o.janaina2004@gmail.com'
];

const CRM_PASSWORD = process.env.CRM_PASSWORD || 'limpanome2026';
const JWT_SECRET = process.env.JWT_SECRET || 'limpanome-crm-secret-key-2026';

// POST /api/auth/login - Login com email + senha
router.post('/login', (req, res) => {
  try {
    const { email, password, senha } = req.body;
    const pass = password || senha;

    if (!email || !pass) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const emailLower = email.toLowerCase().trim();

    // Verificar se email está na lista permitida
    if (!ALLOWED_EMAILS.includes(emailLower)) {
      return res.status(403).json({ error: 'Acesso não autorizado para este email' });
    }

    // Verificar senha
    if (pass !== CRM_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Gerar token JWT (expira em 7 dias)
    const token = jwt.sign(
      { email: emailLower },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { email: emailLower },
      message: 'Login realizado com sucesso'
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Verificar token
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { email: decoded.email }, valid: true });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

module.exports = router;
