const express = require('express');
const router = express.Router();
const { authorizeRequest, processAmarilisWebhook } = require('../lib/amarilisWebhook');

// Webhook dedicado do modulo Amarilis. Mantem os fluxos publicos atuais intocados.
router.post('/', async (req, res) => {
  try {
    if (!authorizeRequest(req)) {
      return res.status(401).json({ error: 'token invalido' });
    }

    const result = await processAmarilisWebhook(req.body || {});

    res.status(result.created ? 201 : 200).json({
      status: 'ok',
      cliente_id: result.cliente.id,
      created: result.created,
      divida_id: result.divida?.id || null,
      tarefa_id: result.tarefa?.id || null
    });
  } catch (err) {
    console.error('Erro no webhook Amarilis:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
