const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { realizarConsulta } = require('../lib/consultaCredito');

// GET /api/clientes - Listar clientes com paginação, busca e filtros
router.get('/', async (req, res) => {
  try {
    const { status, origem, busca, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('clientes_view')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (origem) query = query.eq('origem', origem);
    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
      );
    }

    const { data, count, error } = await query
      .order('data_cadastro', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      data: data || [],
      pagination: {
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id - Detalhes do cliente
router.get('/:id', async (req, res) => {
  try {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Cliente não encontrado' });
      throw error;
    }

    // Buscar dados relacionados em paralelo (incluindo histórico de score)
    const [dividasRes, processosRes, bacenRes, historicoRes, scoreHistoricoRes] = await Promise.all([
      supabase.from('dividas').select('*').eq('cliente_id', cliente.id).order('data_cadastro', { ascending: false }),
      supabase.from('processos').select('*').eq('cliente_id', cliente.id).order('data_cadastro', { ascending: false }),
      supabase.from('apontamentos_bacen').select('*').eq('cliente_id', cliente.id).order('data_consulta', { ascending: false }),
      supabase.from('historico').select('*').eq('cliente_id', cliente.id).order('data_registro', { ascending: false }).limit(20),
      supabase.from('score_historico').select('*').eq('cliente_id', cliente.id).order('data_consulta', { ascending: false })
    ]);

    res.json({
      ...cliente,
      dividas: dividasRes.data || [],
      processos: processosRes.data || [],
      apontamentos_bacen: bacenRes.data || [],
      historico: historicoRes.data || [],
      scores: scoreHistoricoRes.data || []
    });
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes - Criar cliente
router.post('/', async (req, res) => {
  try {
    const {
      nome, cpf, rg, email, telefone, telefone2,
      data_nascimento, endereco, cidade, estado, cep,
      profissao, renda_mensal, estado_civil, servico_contratado,
      origem, status, score_inicial, observacoes
    } = req.body;

    if (!nome || !cpf || !telefone) {
      return res.status(400).json({ error: 'Nome, CPF e telefone são obrigatórios' });
    }

    // Verificar CPF duplicado
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .maybeSingle();

    if (existente) {
      return res.status(409).json({ error: 'Já existe um cliente com este CPF', cliente_id: existente.id });
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        nome, cpf: cpf.replace(/\D/g, ''), rg, email, telefone, telefone2,
        data_nascimento: data_nascimento || null,
        endereco, cidade, estado, cep,
        profissao, renda_mensal: renda_mensal || null,
        estado_civil, servico_contratado: servico_contratado || null,
        origem: origem || 'manual',
        status: status || 'lead',
        score_inicial: score_inicial || null,
        score_atual: score_inicial || null,
        observacoes
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from('historico').insert({
      cliente_id: cliente.id,
      tipo: 'cadastro',
      descricao: `Cliente cadastrado via ${cliente.origem}`,
      usuario: 'sistema'
    });

    res.status(201).json(cliente);
  } catch (err) {
    console.error('Erro ao criar cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const campos = { ...req.body, data_atualizacao: new Date().toISOString() };
    delete campos.id;
    delete campos.uuid;
    delete campos.data_cadastro;

    // Se CPF está sendo alterado, limpar formatação
    if (campos.cpf) campos.cpf = campos.cpf.replace(/\D/g, '');

    const { data: cliente, error } = await supabase
      .from('clientes')
      .update(campos)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Cliente não encontrado' });
      throw error;
    }

    // Registrar alteração no histórico
    const camposAlterados = Object.keys(req.body).filter(k => !['id', 'uuid', 'data_cadastro'].includes(k));
    await supabase.from('historico').insert({
      cliente_id: cliente.id,
      tipo: 'atualizacao',
      descricao: `Campos atualizados: ${camposAlterados.join(', ')}`,
      usuario: 'sistema'
    });

    res.json(cliente);
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clientes/:id - Excluir cliente
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes/:id/consultar-credito - Consultar dados cadastrais, score e dívidas
router.post('/:id/consultar-credito', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Buscar cliente
    const { data: cliente, error: clientErr } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (clientErr || !cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const documento = cliente.cpf;
    if (!documento) {
      return res.status(400).json({ error: 'Cliente não possui CPF cadastrado' });
    }

    // 2. Chamar serviço de consulta
    const consulta = await realizarConsulta(documento);

    // 3. Atualizar cliente com o score e registrar score inicial se necessário
    const updates = {
      score_atual: consulta.score,
      data_atualizacao: new Date().toISOString()
    };
    if (!cliente.score_inicial) {
      updates.score_inicial = consulta.score;
    }

    const { error: updateErr } = await supabase
      .from('clientes')
      .update(updates)
      .eq('id', id);

    if (updateErr) throw updateErr;

    // 4. Salvar score no histórico
    await supabase.from('score_historico').insert({
      cliente_id: id,
      score: consulta.score,
      bureau: 'Geral'
    });

    // 5. Deletar dívidas automáticas anteriores do cliente para evitar duplicidade
    await supabase.from('dividas')
      .delete()
      .eq('cliente_id', id)
      .eq('observacoes', 'Registro importado via consulta automática de birô de crédito.');

    // 6. Gravar novas dívidas se houver
    if (consulta.dividas && consulta.dividas.length > 0) {
      const dividasParaGravar = consulta.dividas.map(d => ({
        cliente_id: id,
        credor: d.credor,
        valor_original: d.valor_original,
        valor_atualizado: d.valor_atualizado,
        tipo: d.tipo,
        bureau: d.bureau,
        data_vencimento: d.data_vencimento,
        contrato: d.contrato,
        status: d.status,
        observacoes: d.observacoes
      }));

      const { error: insDividaErr } = await supabase
        .from('dividas')
        .insert(dividasParaGravar);

      if (insDividaErr) throw insDividaErr;
    }

    // 7. Deletar apontamentos BACEN automáticos anteriores do cliente
    await supabase.from('apontamentos_bacen')
      .delete()
      .eq('cliente_id', id)
      .eq('observacoes', 'Apontamento registrado no SCR - Sistema de Informações de Crédito do Banco Central.');

    // 8. Gravar novos apontamentos BACEN se houver
    if (consulta.apontamentos_bacen && consulta.apontamentos_bacen.length > 0) {
      const bacenParaGravar = consulta.apontamentos_bacen.map(b => ({
        cliente_id: id,
        tipo: b.tipo,
        instituicao: b.instituicao,
        valor: b.valor,
        data_ocorrencia: b.data_ocorrencia,
        status: b.status,
        observacoes: b.observacoes
      }));

      const { error: insBacenErr } = await supabase
        .from('apontamentos_bacen')
        .insert(bacenParaGravar);

      if (insBacenErr) throw insBacenErr;
    }

    // 9. Registrar no histórico do cliente
    const fonteTxt = consulta.simulado ? 'SIMULADA (dados ilustrativos)' : `provider '${consulta.provider}'`;
    await supabase.from('historico').insert({
      cliente_id: id,
      tipo: 'consulta_credito',
      descricao: `Consulta de crédito ${fonteTxt}. Novo score: ${consulta.score}. Restrições importadas: ${consulta.dividas.length} dívidas, ${consulta.apontamentos_bacen.length} apontamentos BACEN.`,
      usuario: 'sistema'
    });

    res.json({
      success: true,
      score: consulta.score,
      dividasImportadas: consulta.dividas.length,
      bacenImportados: consulta.apontamentos_bacen.length,
      provider: consulta.provider,
      simulado: consulta.simulado
    });
  } catch (err) {
    console.error('Erro na consulta de crédito:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
