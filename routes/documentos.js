const express = require('express');
const multer = require('multer');
const router = express.Router();
const supabase = require('../lib/supabase');

// Multer em memória (Vercel serverless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas PDF, PNG e JPG são permitidos'));
    }
  }
});

// GET /api/documentos?cliente_id=X - Listar documentos do cliente
router.get('/', async (req, res) => {
  try {
    const { cliente_id } = req.query;
    if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório' });

    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('cliente_id', cliente_id)
      .order('data_upload', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Erro ao listar documentos:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documentos/upload - Upload de documento
router.post('/upload', upload.single('arquivo'), async (req, res) => {
  try {
    const { cliente_id, tipo, descricao } = req.body;

    if (!cliente_id || !req.file) {
      return res.status(400).json({ error: 'cliente_id e arquivo são obrigatórios' });
    }

    const file = req.file;
    const ext = file.originalname.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const filePath = `cliente_${cliente_id}/${tipo || 'geral'}_${timestamp}.${ext}`;

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Gerar URL pública (ou signed URL)
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath);

    // Salvar metadados no banco
    const { data: doc, error: dbError } = await supabase
      .from('documentos')
      .insert({
        cliente_id: parseInt(cliente_id),
        tipo: tipo || 'geral',
        descricao: descricao || file.originalname,
        nome_arquivo: file.originalname,
        caminho_storage: filePath,
        url: urlData.publicUrl,
        tamanho: file.size,
        mimetype: file.mimetype
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id: parseInt(cliente_id),
      tipo: 'documento',
      descricao: `Documento "${file.originalname}" enviado (${tipo || 'geral'})`,
      usuario: req.user?.email || 'sistema'
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documentos/:id - Excluir documento
router.delete('/:id', async (req, res) => {
  try {
    // Buscar documento para pegar o caminho
    const { data: doc, error: findError } = await supabase
      .from('documentos')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError) throw findError;

    // Remover do Storage
    await supabase.storage
      .from('documentos')
      .remove([doc.caminho_storage]);

    // Remover do banco
    const { error: delError } = await supabase
      .from('documentos')
      .delete()
      .eq('id', req.params.id);

    if (delError) throw delError;

    res.json({ message: 'Documento excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir documento:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
