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
      codigo_id, nome, idade, peso_atual, peso_alvo, altura,
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
      'SELECT id FROM usuarios WHERE codigo_id = $1',
      [codigo_id]
    );

    let usuario_id;

    if (checkUser.rows.length > 0) {
      // Atualizar
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
      // Criar novo
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

      // Inicializar progresso
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

    // Gerar estrutura da dieta
    const dieta = calculos.gerarEstruturaDieta(usuario_id, calorias_alvo, num_refeicoes, macros);

    // Buscar alimentos do banco
    const alimentosResult = await pool.query(
      'SELECT * FROM alimentos ORDER BY categoria, nome LIMIT 50'
    );

    // Para cada refeição, selecionar alimentos (SIMPLIFICADO)
    const alimentos = alimentosResult.rows;
    
    for (let i = 0; i < dieta.refeicoes.length; i++) {
      const refeicao = dieta.refeicoes[i];
      
      // Seleciona até 3 alimentos aleatórios como opções
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

    // Gerar estrutura do treino
    const treino = calculos.gerarEstruturaTreino(usuario_id, dias_treino, tempo_minuto, local, nivel, objetivo);

    // Buscar exercícios conforme local e nível
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

    // Montar treino dia por dia
    for (let dia = 0; dia < treino.dias.length; dia++) {
      const dia_treino = treino.dias[dia];
      const tempo_disponivel = dia_treino.tempo_disponivel_minutos;
      
      let tempo_acumulado = 0;
      const exercicios_dia = [];

      // Seleciona exercícios que cabem no tempo disponível
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

    // Gerar estrutura do cardio
    const cardio = calculos.gerarEstruturacardio(usuario_id, local, objetivo, dias_treino);

    // Buscar cardio conforme local
    const localMap = {
      'academia': 'Academia',
      'casa': 'Casa'
    };

    const cardioResult = await pool.query(
      'SELECT * FROM cardio WHERE local = $1 LIMIT 10',
      [localMap[local] || local]
    );

    // Seleciona até 3 tipos de cardio
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
// APIS ADMIN - PROTEGIDAS
// ═══════════════════════════════════════════════════════════════════

// 1. Gerar novo código
app.post('/api/admin/gerar-codigo', verificarAutenticacao, async (req, res) => {
  try {
    const { duracao_dias = 60, notas = '' } = req.body;

    const codigo = calculos.gerarCodigo(8);
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + duracao_dias);

    await pool.query(
      `INSERT INTO codigos (codigo, ativo, duracao_dias, vencimento, notas)
       VALUES ($1, true, $2, $3, $4)`,
      [codigo, duracao_dias, vencimento, notas]
    );

    res.json({
      ok: true,
      codigo,
      vencimento,
      duracao_dias
    });

  } catch (err) {
    console.error('Erro ao gerar código:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar código' });
  }
});

// 2. Listar códigos
app.get('/api/admin/codigos', verificarAutenticacao, async (req, res) => {
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

// 3. Desativar código
app.post('/api/admin/desativar-codigo/:id', verificarAutenticacao, async (req, res) => {
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

// 4. Listar usuários
app.get('/api/admin/usuarios', verificarAutenticacao, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.idade, u.objetivo, u.nivel, u.criado_em, c.codigo
       FROM usuarios u
       LEFT JOIN codigos c ON u.codigo_id = c.id
       ORDER BY u.criado_em DESC
       LIMIT 200`
    );

    res.json({
      ok: true,
      usuarios: result.rows,
      total: result.rows.length
    });

  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao listar usuários' });
  }
});

// 5. Ver detalhes de um usuário
app.get('/api/admin/usuario/:id', verificarAutenticacao, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });
    }

    res.json({
      ok: true,
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error('Erro ao buscar usuário:', err.message);
    res.status(500).json({ ok: false, erro: 'Erro ao buscar usuário' });
  }
});

// 6. Dashboard admin (estatísticas)
app.get('/api/admin/dashboard', verificarAutenticacao, async (req, res) => {
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
  console.error('❌ Erro não capturado:', err);
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