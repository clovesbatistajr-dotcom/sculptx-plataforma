const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDatabase() {
  try {
    console.log('🔄 Verificando tabelas...');
    const client = await pool.connect();

    // Verificar se tabela existe
    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios')"
    );

    if (!tableCheck.rows[0].exists) {
      console.log('🔄 Criando tabelas...');

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

      await client.query(sql);
      console.log('✅ Tabelas criadas!');

      // Criar admin padrão
      await client.query(
        `INSERT INTO admin (username, password) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        ['admin', '01010924Clo#']
      );
      console.log('✅ Admin criado!');
    } else {
      console.log('✅ Tabelas já existem!');
    }

    client.release();
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
  }
}

module.exports = initDatabase;
