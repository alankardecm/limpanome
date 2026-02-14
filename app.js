require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/dividas', require('./routes/dividas'));
app.use('/api/processos', require('./routes/processos'));
app.use('/api/bacen', require('./routes/bacen'));
app.use('/api/historico', require('./routes/historico'));
app.use('/api/tarefas', require('./routes/tarefas'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/webhook', require('./routes/webhook'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro interno:', err);
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
});

module.exports = app;
