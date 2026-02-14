const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// GET /api/dashboard - Estatísticas completas do dashboard
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats');

    if (error) throw error;

    res.json(data || {});
  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
