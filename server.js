const path = require('path');
const app = require('./app');

// Servir arquivos estáticos (apenas para desenvolvimento local)
const express = require('express');
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback - qualquer rota não-API retorna o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 CRM Limpa Nome rodando em http://localhost:${PORT}\n`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API:       http://localhost:${PORT}/api/health\n`);
});
