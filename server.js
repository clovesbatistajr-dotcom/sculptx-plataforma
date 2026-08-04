const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { pool, initDatabase } = require('./config/database');
const { verificarAutenticacao } = require('./middleware/auth');
const calculos = require('./config/calculos');

const app = express();

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════════

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════
// LOG MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAR BANCO NO STARTUP
// ═══════════════════════════════════════════════════════════════════

initDatabase().catch(err => {
  console.error('Erro ao inicializar banco:', err);
});

// ═══════════════════════════════════════════════════════════════════
// CALCULO DE FASE (ILIMITADA - AVANCA A CADA 60 DIAS)
// ═══════════════════════════════════════════════════════════════════

const DIAS_POR_FASE = 60;

function calcularFase(criado_em) {
  if (!criado_em) return 1;
  const inicio = new Date(criado_em);
  if (isNaN(inicio.getTime())) return 1;
  const hoje = new Date();
  const diasCorridos = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
  if (diasCorridos < 0) return 1;
  return Math.floor(diasCorridos / DIAS_POR_FASE) + 1;
}

function proximaFaseEm(criado_em) {
  if (!criado_em) return null;
  const inicio = new Date(criado_em);
  if (isNaN(inicio.getTime())) return null;
  const fase = calcularFase(criado_em);
  const proxima = new Date(inicio);
  proxima.setDate(proxima.getDate() + (fase * DIAS_POR_FASE));
  return proxima;
}

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// APIS PÚBLICAS - USUÁRIO
// ═══════════════════════════════════════════════════════════════════

// 1. Verificar código válido
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

    // Verificar se já tem usuário
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

// 2. Salvar onboarding
app.post('/api/onboarding', async (req, res) => {
  try {
    const {
      codigo_id, nome, email, whatsapp, idade, peso_atual, peso_alvo, altura,
      sexo, objetivo, nivel, rotina, dias_treino, tempo_treino, refeicoes, local_treino
    } = req.body;

    // Validar dados
    const erros = calculos.validarDados({
      nome, idade, peso_atual, altura, sexo, objetivo, nivel, rotina, dias_treino, refeicoes
    });

    if (erros.length > 0) {
      return res.status(400).json({ ok: false, erros });
    }

    if (!codigo_id) {
      return res.status(400).json({ ok: false, erro: 'Código inválido' });
    }

    // Calcular protocolo
    const protocolo = calculos.calcularProtocolo(
      sexo, peso_atual, altura, idade, rotina, objetivo
    );

    // Verificar se usuário existe
    const checkUser = await pool.query(
      'SELECT id, criado_em FROM usuarios WHERE codigo_id = $1',
      [codigo_id]
    );

    let usuario_id;
    let criado_em;

    if (checkUser.rows.length > 0) {
      // Atualizar
      usuario_id = checkUser.rows[0].id;
      criado_em = checkUser.rows[0].criado_em;
      await pool.query(
        `UPDATE usuarios SET
          nome=$2, idade=$3, peso_atual=$4, peso_alvo=$5, altura=$6,
          sexo=$7, objetivo=$8, nivel=$9, rotina=$10, dias_treino=$11,
          tempo_treino=$12, refeicoes=$13, tdee=$14, calorias_alvo=$15,
          proteina_g=$16, carbo_g=$17, gordura_g=$18, local_treino=$19,
          email=$20, whatsapp=$21, atualizado_em=NOW()
         WHERE id=$1`,
        [usuario_id, nome, idade, peso_atual, peso_alvo, altura, sexo, objetivo,
         nivel, rotina, dias_treino, tempo_treino, refeicoes, protocolo.tdee,
         protocolo.calorias_alvo, protocolo.proteina_g, protocolo.carbo_g, protocolo.gordura_g,
         local_treino || 'Academia', email || null, whatsapp || null]
      );
    } else {
      // Criar novo
      const result = await pool.query(
        `INSERT INTO usuarios
          (codigo_id, nome, idade, peso_atual, peso_alvo, altura, sexo, objetivo,
           nivel, rotina, dias_treino, tempo_treino, refeicoes, tdee, calorias_alvo,
           proteina_g, carbo_g, gordura_g, local_treino, email, whatsapp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         RETURNING id, criado_em`,
        [codigo_id, nome, idade, peso_atual, peso_alvo, altura, sexo, objetivo,
         nivel, rotina, dias_treino, tempo_treino, refeicoes, protocolo.tdee,
         protocolo.calorias_alvo, protocolo.proteina_g, protocolo.carbo_g, protocolo.gordura_g,
         local_treino || 'Academia', email || null, whatsapp || null]
      );
      usuario_id = result.rows[0].id;
      criado_em = result.rows[0].criado_em;

      // Inicializar progresso
      await pool.query(
        `INSERT INTO progresso (usuario_id, tipo, categoria, nivel, fase_atual, proximo_desbloqueio)
         VALUES ($1, 'treino', $2, $3, 1, NOW() + INTERVAL '60 days'),
                ($1, 'dieta', $2, $3, 1, NOW() + INTERVAL '60 days')`,
        [usuario_id, objetivo, nivel]
      );
    }

    const fase_atual = calcularFase(criado_em);

    res.json({
      ok: true,
      usuario_id,
      criado_em,
      fase_atual,
      proxima_fase_em: proximaFaseEm(criado_em),
      local_treino: local_treino || 'Academia',
      ...protocolo
    });

  } catch (err) {
    console.error('Erro em onboarding:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar dados' });
  }
});

// 3. Puxar dados do usuário
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
    const fase_atual = calcularFase(usuario.criado_em);

    // Manter a fase gravada no banco sempre atualizada
    try {
      await pool.query(
        `UPDATE progresso SET fase_atual = $2, proximo_desbloqueio = $3
         WHERE usuario_id = $1`,
        [usuario.id, fase_atual, proximaFaseEm(usuario.criado_em)]
      );
    } catch (e) {
      console.error('Aviso: nao foi possivel atualizar progresso:', e.message);
    }

    const progResult = await pool.query(
      'SELECT * FROM progresso WHERE usuario_id = $1',
      [usuario.id]
    );

    usuario.fase_atual = fase_atual;
    usuario.proxima_fase_em = proximaFaseEm(usuario.criado_em);

    res.json({
      ok: true,
      usuario,
      fase_atual,
      progresso: progResult.rows
    });

  } catch (err) {
    console.error('Erro em /api/usuario:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar dados' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// APIS NOVAS - GERAR DIETA, TREINO, CARDIO
// ═══════════════════════════════════════════════════════════════════

// 1. Gerar dieta personalizada
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

    res.json({
      ok: true,
      dieta
    });

  } catch (err) {
    console.error('Erro ao gerar dieta:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar dieta' });
  }
});

// 2. Gerar treino personalizado
app.post('/api/gerar-treino', async (req, res) => {
  try {
    const { usuario_id, dias_treino, tempo_minuto, local, nivel, objetivo } = req.body;

    if (!usuario_id || !dias_treino || !tempo_minuto) {
      return res.status(400).json({ ok: false, erro: 'Dados incompletos' });
    }

    const treino = calculos.gerarEstruturaTreino(usuario_id, dias_treino, tempo_minuto, local, nivel, objetivo);

    const localMap = {
      'academia': 'Academia',
      'casa': 'Casa'
    };

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

    res.json({
      ok: true,
      treino
    });

  } catch (err) {
    console.error('Erro ao gerar treino:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar treino' });
  }
});

// 3. Gerar cardio
app.post('/api/gerar-cardio', async (req, res) => {
  try {
    const { usuario_id, local, objetivo, dias_treino } = req.body;

    if (!usuario_id || !local) {
      return res.status(400).json({ ok: false, erro: 'Dados incompletos' });
    }

    const cardio = calculos.gerarEstruturacardio(usuario_id, local, objetivo, dias_treino);

    const localMap = {
      'academia': 'Academia',
      'casa': 'Casa'
    };

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

    res.json({
      ok: true,
      cardio
    });

  } catch (err) {
    console.error('Erro ao gerar cardio:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar cardio' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE PARA VALIDAR SENHA ADMIN
// ═══════════════════════════════════════════════════════════════════

const ADMIN_PASSWORD = '01010924Clo#';

function validarSenhaAdmin(req, res, next) {
  const senha = req.headers['x-admin-password'] || req.body.password;
  
  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ 
      ok: false, 
      message: 'Senha de admin inválida' 
    });
  }
  
  next();
}

// ═══════════════════════════════════════════════════════════════════
// APIS ADMIN - PROTEGIDAS COM SENHA
// ═══════════════════════════════════════════════════════════════════

// 1. Dashboard admin (estatísticas)
app.get('/api/admin/dashboard', validarSenhaAdmin, async (req, res) => {
  try {
    const codigos = await pool.query('SELECT COUNT(*) FROM codigos WHERE ativo = true');
    const usuarios = await pool.query('SELECT COUNT(*) FROM usuarios');
    const codigosMes = await pool.query(
      "SELECT COUNT(*) FROM codigos WHERE criado_em >= NOW() - INTERVAL '30 days'"
    );

    res.json({
      ok: true,
      stats: {
        codigos_ativos: parseInt(codigos.rows[0].count),
        usuarios_total: parseInt(usuarios.rows[0].count),
        codigos_ultimo_mes: parseInt(codigosMes.rows[0].count)
      }
    });

  } catch (err) {
    console.error('Erro no dashboard admin:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao carregar dashboard' });
  }
});

// 2. Listar códigos
app.get('/api/admin/codigos', validarSenhaAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, codigo, ativo, duracao_dias, vencimento, criado_em, notas,
              (SELECT COUNT(*) FROM usuarios WHERE codigo_id = codigos.id) as usuarios
       FROM codigos
       ORDER BY criado_em DESC
       LIMIT 100`
    );

    res.json({
      ok: true,
      codigos: result.rows
    });

  } catch (err) {
    console.error('Erro ao listar códigos:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao listar códigos' });
  }
});

// 3. Gerar novo código
app.post('/api/admin/gerar-codigo', validarSenhaAdmin, async (req, res) => {
  try {
    const { duracao_dias = 60, notas = '' } = req.body;

    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + duracao_dias);

    const result = await pool.query(
      `INSERT INTO codigos (codigo, ativo, duracao_dias, vencimento, notas)
       VALUES ($1, true, $2, $3, $4)
       RETURNING id, codigo`,
      [codigo, duracao_dias, vencimento, notas]
    );

    res.json({
      ok: true,
      codigo: result.rows[0].codigo,
      vencimento,
      duracao_dias
    });

  } catch (err) {
    console.error('Erro ao gerar código:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar código' });
  }
});

// 4. Desativar código
app.post('/api/admin/desativar-codigo/:id', validarSenhaAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE codigos SET ativo = false WHERE id = $1',
      [id]
    );

    res.json({ ok: true, mensagem: 'Código desativado' });

  } catch (err) {
    console.error('Erro ao desativar código:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao desativar' });
  }
});

// 5. Listar usuários
app.get('/api/admin/usuarios', validarSenhaAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.idade, u.sexo, u.objetivo, u.nivel,
              u.dias_treino, u.tempo_treino, u.local_treino, u.calorias_alvo,
              u.proteina_g, u.carbo_g, u.gordura_g,
              u.criado_em, c.codigo
       FROM usuarios u
       LEFT JOIN codigos c ON u.codigo_id = c.id
       ORDER BY u.criado_em DESC
       LIMIT 200`
    );

    // Calcula a fase de cada aluno
    const usuarios = result.rows.map(u => {
      const fase = calcularFase(u.criado_em);
      const proxima = proximaFaseEm(u.criado_em);
      let diasRestantes = null;
      if (proxima) {
        diasRestantes = Math.ceil((proxima - new Date()) / (1000 * 60 * 60 * 24));
      }
      return Object.assign({}, u, {
        fase_atual: fase,
        proxima_fase_em: proxima,
        dias_para_proxima_fase: diasRestantes
      });
    });

    res.json({
      ok: true,
      usuarios,
      total: usuarios.length
    });

  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao listar usuários' });
  }
});

// 6. Ver detalhes de um usuário
app.get('/api/admin/usuario/:id', validarSenhaAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });
    }

    const usuario = result.rows[0];
    usuario.fase_atual = calcularFase(usuario.criado_em);
    usuario.proxima_fase_em = proximaFaseEm(usuario.criado_em);

    res.json({
      ok: true,
      usuario
    });

  } catch (err) {
    console.error('Erro ao buscar usuário:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar usuário' });
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
// 404 - Não encontrado
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