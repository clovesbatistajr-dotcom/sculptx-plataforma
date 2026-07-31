const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err.message);
});

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAR BANCO
// ═══════════════════════════════════════════════════════════════════

async function initDatabase() {
  try {
    console.log('🔧 Inicializando banco de dados...');

    // Tabela Admin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela Códigos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS codigos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW(),
        vencimento TIMESTAMP,
        duracao_dias INT DEFAULT 60,
        usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        notas TEXT
      );
    `);

    // Tabela Usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        codigo_id INT REFERENCES codigos(id),
        nome VARCHAR(255) NOT NULL,
        idade INT,
        peso_atual DECIMAL(5,2),
        peso_alvo DECIMAL(5,2),
        altura INT,
        sexo VARCHAR(10),
        objetivo VARCHAR(50),
        nivel VARCHAR(50),
        rotina VARCHAR(50),
        dias_treino INT,
        tempo_treino VARCHAR(50),
        refeicoes INT,
        tdee INT,
        calorias_alvo INT,
        proteina_g INT,
        carbo_g INT,
        gordura_g INT,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela Progresso
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progresso (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(50),
        categoria VARCHAR(50),
        nivel VARCHAR(50),
        fase_atual INT DEFAULT 1,
        data_inicio TIMESTAMP DEFAULT NOW(),
        proximo_desbloqueio TIMESTAMP,
        UNIQUE(usuario_id, tipo, categoria, nivel)
      );
    `);

    // Tabela Logs (para rastreamento)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        acao VARCHAR(100),
        tabela VARCHAR(50),
        dados_id INT,
        usuario VARCHAR(100),
        ip VARCHAR(50),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Banco de dados inicializado com sucesso');

    // Criar admin padrão se não existir
    await criarAdminPadrao();

  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err.message);
  }
}

async function criarAdminPadrao() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM admin');
    
    if (result.rows[0].count === '0') {
      // Criar admin com senha padrão (MUDAR DEPOIS!)
      await pool.query(
        'INSERT INTO admin (username, password_hash) VALUES ($1, $2)',
        ['admin', '01010924Clo#'] // ⚠️ MUDAR NO PAINEL DEPOIS
      );
      console.log('🔐 Admin padrão criado: admin / 01010924Clo#');
      console.log('⚠️  MUDE A SENHA NO PAINEL ADMIN ASSIM QUE SUBIR!');
    }
  } catch (err) {
    if (!err.message.includes('duplicate key')) {
      console.error('Erro ao criar admin:', err.message);
    }
  }
}

module.exports = {
  pool,
  initDatabase,
  query: (text, params) => pool.query(text, params)
};
