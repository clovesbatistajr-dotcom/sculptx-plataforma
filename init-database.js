const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://sculptx_db_cloves_2026_user:hPVLpjhmHKGkwfknc1Sgwac4qgk6KbZc@dpg-d9m1pdflk1mc739j9qvg-a/sculptx_db_cloves_2026'
});

const sql = `
CREATE TABLE IF NOT EXISTS admin (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS codigos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  dias_validade INTEGER NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_vencimento TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'ativo',
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  codigo_id INTEGER NOT NULL,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  whatsapp VARCHAR(20),
  objetivo VARCHAR(50),
  nivel_experiencia VARCHAR(50),
  dias_treino INTEGER,
  peso DECIMAL(5,2),
  altura DECIMAL(5,2),
  idade INTEGER,
  sexo VARCHAR(10),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (codigo_id) REFERENCES codigos(id)
);

CREATE TABLE IF NOT EXISTS progresso (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  data DATE DEFAULT CURRENT_DATE,
  peso DECIMAL(5,2),
  nota TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(100),
  mensagem TEXT,
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function initDatabase() {
  try {
    console.log('🔄 Conectando ao banco...');
    const client = await pool.connect();
    console.log('✅ Conectado!');

    console.log('🔄 Criando tabelas...');
    await client.query(sql);
    console.log('✅ Tabelas criadas com sucesso!');

    await client.query(
      `INSERT INTO admin (username, password) 
       VALUES ('admin', '01010924Clo#') 
       ON CONFLICT DO NOTHING`
    );
    console.log('✅ Admin criado!');

    client.release();
    await pool.end();
    console.log('✅ PRONTO! Banco inicializado!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

initDatabase();
