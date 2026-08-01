const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool, initDatabase } = require('./config/database');
const calculos = require('./config/calculos');

const app = express();

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAR BANCO
// ═══════════════════════════════════════════════════════════════════

initDatabase().catch(err => console.error('Erro ao inicializar banco:', err));

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════════════════════════

const ADMIN_PASSWORD = '01010924Clo#';

app.get('/api/admin/dashboard', (req, res) => {
  try {
    const senha = req.headers['x-admin-password'];
    
    if (senha !== ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, message: 'Senha inválida' });
    }
    
    res.json({
      ok: true,
      stats: {
        codigos_ativos: 5,
        usuarios_total: 2,
        codigos_ultimo_mes: 1
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get('/api/admin/codigos', (req, res) => {
  const senha = req.headers['x-admin-password'];
  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: 'Senha inválida' });
  }
  
  res.json({
    ok: true,
    codigos: [
      { id: 1, codigo: 'ABC12345', ativo: true, duracao_dias: 60, usuarios: 1 }
    ]
  });
});

// ⭐ GERAR CÓDIGO - CORRIGIDO (SEM created_at que pode não existir)
app.post('/api/admin/gerar-codigo', async (req, res) => {
  try {
    const senha = req.headers['x-admin-password'];
    if (senha !== ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, message: 'Senha inválida' });
    }
    
    const { duracao_dias = 60, notas = '' } = req.body;

    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + duracao_dias);

    console.log('[ADMIN] Gerando código:', codigo);
    console.log('[ADMIN] Duração:', duracao_dias, 'dias');
    console.log('[ADMIN] Vencimento:', vencimento);

    // SALVAR NO BANCO - SEM created_at (deixa o banco usar default)
    const result = await pool.query(
      `INSERT INTO codigos (codigo, ativo, duracao_dias, vencimento, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, codigo, vencimento, ativo, duracao_dias`,
      [codigo, true, parseInt(duracao_dias), vencimento, notas || null]
    );

    console.log('[ADMIN] Código SALVO com sucesso:', result.rows[0]);

    res.json({
      ok: true,
      codigo: result.rows[0].codigo,
      vencimento: result.rows[0].vencimento,
      duracao_dias: result.rows[0].duracao_dias,
      ativo: result.rows[0].ativo
    });

  } catch (err) {
    console.error('[ADMIN] ERRO ao gerar código:', err.message);
    console.error('[ADMIN] Stack:', err.stack);
    res.status(500).json({ 
      ok: false, 
      message: 'Erro ao gerar código',
      erro: err.message
    });
  }
});

app.get('/api/admin/usuarios', (req, res) => {
  const senha = req.headers['x-admin-password'];
  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: 'Senha inválida' });
  }
  
  res.json({
    ok: true,
    usuarios: [
      { id: 1, nome: 'João Silva', objetivo: 'Emagrecimento', nivel: 'Intermediário', criado_em: new Date() }
    ]
  });
});

app.post('/api/admin/desativar-codigo/:id', (req, res) => {
  const senha = req.headers['x-admin-password'];
  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: 'Senha inválida' });
  }
  
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════
// APIS PÚBLICAS - USUÁRIO
// ═══════════════════════════════════════════════════════════════════

app.post('/api/check-code', async (req, res) => {
  try {
    const { codigo } = req.body;

    if (!codigo || codigo.length < 3) {
      return res.status(400).json({ ok: false, erro: 'Código inválido' });
    }

    const result = await pool.query(
      `SELECT * FROM codigos 
       WHERE codigo = $1 
       AND ativo = true 
       AND (vencimento IS NULL OR vencimento > NOW())`,
      [codigo.toUpperCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, erro: 'Código inválido ou expirado' });
    }

    const codigoData = result.rows[0];
    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE codigo_id = $1',
      [codigoData.id]
    );

    const temUsuario = userResult.rows.length > 0;

    res.json({
      ok: true,
      codigo_id: codigoData.id,
      temUsuario,
      duracao_dias: codigoData.duracao_dias
    });

  } catch (err) {
    console.error('Erro em check-code:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro no servidor' });
  }
});

app.post('/api/onboarding', async (req, res) => {
  try {
    const {
      codigo_id, nome, idade, peso_atual, peso_alvo, altura,
      sexo, objetivo, nivel, rotina, dias_treino, tempo_treino, refeicoes, local_treino
    } = req.body;

    const erros = calculos.validarDados({
      nome, idade, peso_atual, altura, sexo, objetivo, nivel, rotina, dias_treino, refeicoes
    });

    if (erros.length > 0) {
      return res.status(400).json({ ok: false, erros });
    }

    if (!codigo_id) {
      return res.status(400).json({ ok: false, erro: 'Código inválido' });
    }

    const protocolo = calculos.calcularProtocolo(
      sexo, peso_atual, altura, idade, rotina, objetivo
    );

    const checkUser = await pool.query(
      'SELECT id FROM usuarios WHERE codigo_id = $1',
      [codigo_id]
    );

    let usuario_id;

    if (checkUser.rows.length > 0) {
      usuario_id = checkUser.rows[0].id;
      await pool.query(
        `UPDATE usuarios SET
          nome=$2, idade=$3, peso_atual=$4, peso_alvo=$5, altura=$6,
          sexo=$7, objetivo=$8, nivel=$9, rotina=$10, dias_treino=$11,
          tempo_treino=$12, refeicoes=$13, tdee=$14, calorias_alvo=$15,
          proteina_g=$16, carbo_g=$17, gordura_g=$18, atualizado_em=NOW()
         WHERE id=$1`,
        [usuario_id, nome, idade, peso_atual, peso_alvo, altura, sexo, objetivo,
         nivel, rotina, dias_treino, tempo_treino, refeicoes, protocolo.tdee,
         protocolo.calorias_alvo, protocolo.proteina_g, protocolo.carbo_g, protocolo.gordura_g]
      );
    } else {
      const result = await pool.query(
        `INSERT INTO usuarios
          (codigo_id, nome, idade, peso_atual, peso_alvo, altura, sexo, objetivo,
           nivel, rotina, dias_treino, tempo_treino, refeicoes, tdee, calorias_alvo,
           proteina_g, carbo_g, gordura_g)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING id`,
        [codigo_id, nome, idade, peso_atual, peso_alvo, altura, sexo, objetivo,
         nivel, rotina, dias_treino, tempo_treino, refeicoes, protocolo.tdee,
         protocolo.calorias_alvo, protocolo.proteina_g, protocolo.carbo_g, protocolo.gordura_g]
      );
      usuario_id = result.rows[0].id;

      await pool.query(
        `INSERT INTO progresso (usuario_id, tipo, categoria, nivel, fase_atual, proximo_desbloqueio)
         VALUES ($1, 'treino', $2, $3, 1, NOW() + INTERVAL '30 days'),
                ($1, 'dieta', $2, $3, 1, NOW() + INTERVAL '30 days')`,
        [usuario_id, objetivo, nivel]
      );
    }

    res.json({
      ok: true,
      usuario_id,
      ...protocolo
    });

  } catch (err) {
    console.error('Erro em onboarding:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar dados' });
  }
});

app.get('/api/usuario/:codigo_id', async (req, res) => {
  try {
    const { codigo_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE codigo_id = $1',
      [codigo_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });
    }

    const usuario = result.rows[0];
    const progResult = await pool.query(
      'SELECT * FROM progresso WHERE usuario_id = $1',
      [usuario.id]
    );

    res.json({
      ok: true,
      usuario,
      progresso: progResult.rows
    });

  } catch (err) {
    console.error('Erro em /api/usuario:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar dados' });
  }
});

app.post('/api/gerar-dieta', async (req, res) => {
  try {
    const { usuario_id, calorias_alvo, num_refeicoes, macros } = req.body;

    if (!usuario_id || !calorias_alvo || !num_refeicoes) {
      return res.status(400).json({ ok: false, erro: 'Dados incompletos' });
    }

    const dieta = calculos.gerarEstruturaDieta(usuario_id, calorias_alvo, num_refeicoes, macros);
    const alimentosResult = await pool.query(
      'SELECT * FROM alimentos ORDER BY categoria, nome LIMIT 50'
    );

    const alimentos = alimentosResult.rows;
    
    for (let i = 0; i < dieta.refeicoes.length; i++) {
      const refeicao = dieta.refeicoes[i];
      const opcoes = [];
      for (let j = 0; j < 3 && j < alimentos.length; j++) {
        const alimento = alimentos[Math.floor(Math.random() * alimentos.length)];
        opcoes.push({
          nome: alimento.nome,
          porcao: alimento.porcao,
          calorias: alimento.calorias,
          proteina: alimento.proteina_g,
          carbo: alimento.carbo_g,
          gordura: alimento.gordura_g
        });
      }
      refeicao.opcoes = opcoes;
    }

    res.json({ ok: true, dieta });

  } catch (err) {
    console.error('Erro ao gerar dieta:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar dieta' });
  }
});

app.post('/api/gerar-treino', async (req, res) => {
  try {
    const { usuario_id, dias_treino, tempo_minuto, local, nivel, objetivo } = req.body;

    if (!usuario_id || !dias_treino || !tempo_minuto) {
      return res.status(400).json({ ok: false, erro: 'Dados incompletos' });
    }

    const treino = calculos.gerarEstruturaTreino(usuario_id, dias_treino, tempo_minuto, local, nivel, objetivo);

    const localMap = { 'academia': 'Academia', 'casa': 'Casa' };

    const exerciciosResult = await pool.query(
      `SELECT * FROM exercicios 
       WHERE (local = $1 OR local = 'Academia' OR local = 'Casa')
       AND nivel = $2
       ORDER BY tempo_minutos ASC
       LIMIT 80`,
      [localMap[local] || local, nivel]
    );

    const exercicios = exerciciosResult.rows;

    for (let dia = 0; dia < treino.dias.length; dia++) {
      const dia_treino = treino.dias[dia];
      const tempo_disponivel = dia_treino.tempo_disponivel_minutos;
      
      let tempo_acumulado = 0;
      const exercicios_dia = [];

      for (let i = 0; i < exercicios.length && tempo_acumulado < tempo_disponivel; i++) {
        const ex = exercicios[i];
        
        if (tempo_acumulado + ex.tempo_minutos <= tempo_disponivel) {
          exercicios_dia.push({
            nome: ex.nome,
            series: ex.series,
            repeticoes: ex.repeticoes,
            descanso_segundos: ex.descanso_segundos,
            tempo_minutos: ex.tempo_minutos,
            tipo: ex.tipo,
            link: ex.link_video
          });
          
          tempo_acumulado += ex.tempo_minutos;
        }
      }
      
      dia_treino.exercicios = exercicios_dia;
      dia_treino.tempo_total_usado = tempo_acumulado;
    }

    res.json({ ok: true, treino });

  } catch (err) {
    console.error('Erro ao gerar treino:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar treino' });
  }
});

app.post('/api/gerar-cardio', async (req, res) => {
  try {
    const { usuario_id, local, objetivo, dias_treino } = req.body;

    if (!usuario_id || !local) {
      return res.status(400).json({ ok: false, erro: 'Dados incompletos' });
    }

    const cardio = calculos.gerarEstruturacardio(usuario_id, local, objetivo, dias_treino);

    const localMap = { 'academia': 'Academia', 'casa': 'Casa' };

    const cardioResult = await pool.query(
      'SELECT * FROM cardio WHERE local = $1 LIMIT 10',
      [localMap[local] || local]
    );

    const cardios = cardioResult.rows.slice(0, 3);
    cardio.dias_cardio = cardios.map(c => ({
      tipo: c.tipo,
      duracao_minutos: c.duracao_minutos,
      intensidade: c.intensidade
    }));

    res.json({ ok: true, cardio });

  } catch (err) {
    console.error('Erro ao gerar cardio:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar cardio' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROTAS ESTÁTICAS
// ═══════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ═══════════════════════════════════════════════════════════════════
// 404
// ═══════════════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({ ok: false, erro: 'Rota não encontrada' });
});

// ═══════════════════════════════════════════════════════════════════
// TRATAMENTO DE ERROS GLOBAL
// ═══════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('Erro não capturado:', err);
  res.status(500).json({
    ok: false,
    erro: process.env.NODE_ENV === 'production' ? 'Erro no servidor' : err.message
  });
});

// ═══════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 SculptX Plataforma v2.1 iniciado!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
  console.log(`\n⚙️ Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});