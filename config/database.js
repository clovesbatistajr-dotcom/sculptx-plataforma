const { Pool } = require('pg');

// Criar conexão com o pool (NÃO vai fechar!)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// SQL com TODAS as tabelas (antigas + novas)
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
    ativo BOOLEAN DEFAULT true,
    duracao_dias INTEGER NOT NULL,
    vencimento TIMESTAMP NOT NULL,
    notas TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    codigo_id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    whatsapp VARCHAR(20),
    idade INTEGER,
    peso_atual DECIMAL(6,2),
    peso_alvo DECIMAL(6,2),
    altura INTEGER,
    sexo VARCHAR(20),
    objetivo VARCHAR(50),
    nivel VARCHAR(50),
    rotina VARCHAR(50),
    dias_treino INTEGER,
    tempo_treino INTEGER,
    refeicoes INTEGER,
    tdee INTEGER,
    calorias_alvo INTEGER,
    proteina_g INTEGER,
    carbo_g INTEGER,
    gordura_g INTEGER,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (codigo_id) REFERENCES codigos(id)
  );

  CREATE TABLE IF NOT EXISTS progresso (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    tipo VARCHAR(50),
    categoria VARCHAR(50),
    nivel VARCHAR(50),
    fase_atual INTEGER DEFAULT 1,
    proximo_desbloqueio TIMESTAMP,
    data DATE DEFAULT CURRENT_DATE,
    peso DECIMAL(6,2),
    nota TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(100),
    mensagem TEXT,
    usuario_id INTEGER,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alimentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    calorias DECIMAL(6,2) NOT NULL,
    proteina_g DECIMAL(6,2) NOT NULL,
    carbo_g DECIMAL(6,2) NOT NULL,
    gordura_g DECIMAL(6,2) NOT NULL,
    porcao VARCHAR(50),
    categoria VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercicios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    series INTEGER NOT NULL,
    repeticoes INTEGER NOT NULL,
    descanso_segundos INTEGER NOT NULL,
    tempo_minutos INTEGER NOT NULL,
    tipo VARCHAR(50),
    local VARCHAR(50),
    nivel VARCHAR(50),
    link_video VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cardio (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    local VARCHAR(50) NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    intensidade VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fases_treino (
    id SERIAL PRIMARY KEY,
    numero_fase INTEGER NOT NULL,
    nivel VARCHAR(50) NOT NULL,
    progressao_tipo VARCHAR(50),
    multiplicador_dificuldade DECIMAL(3,2),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Função de inicialização (SEM fechar o pool!)
async function initDatabase() {
  try {
    console.log('🔄 Conectando ao banco...');
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    console.log('🔄 Criando tabelas...');
    await client.query(sql);
    console.log('✅ Tabelas criadas/verificadas!');

    // Inserir admin padrão
    await client.query(
      `INSERT INTO admin (username, password) 
       VALUES ('admin', '01010924Clo#') 
       ON CONFLICT DO NOTHING`
    );
    console.log('✅ Admin padrão criado!');

    // Inserir alimentos iniciais
    await client.query(`
      INSERT INTO alimentos (nome, calorias, proteina_g, carbo_g, gordura_g, porcao, categoria)
      VALUES 
        ('Frango peito', 165, 31, 0, 3.6, '100g', 'Proteína'),
        ('Arroz branco', 130, 2.7, 28, 0.3, '100g', 'Carboidrato'),
        ('Ovo', 155, 13, 1.1, 11, '1 unidade', 'Proteína'),
        ('Pão integral', 80, 4, 14, 1.2, '1 fatia', 'Carboidrato'),
        ('Brócolis', 34, 3.7, 7, 0.4, '100g', 'Vegetação'),
        ('Batata doce', 86, 1.6, 20, 0.1, '100g', 'Carboidrato'),
        ('Peixe', 120, 25, 0, 2.5, '100g', 'Proteína'),
        ('Leite integral', 64, 3.2, 4.8, 3.6, '100ml', 'Proteína'),
        ('Maçã', 52, 0.3, 14, 0.2, '1 média', 'Fruta'),
        ('Banana', 89, 1.1, 23, 0.3, '1 média', 'Fruta')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Alimentos carregados!');

    // Inserir exercícios iniciais
    await client.query(`
      INSERT INTO exercicios (nome, series, repeticoes, descanso_segundos, tempo_minutos, tipo, local, nivel, link_video)
      VALUES 
        ('Agachamento', 3, 15, 90, 10, 'Força', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Agachamento com mochila', 3, 15, 90, 10, 'Força', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Flexão', 3, 12, 60, 8, 'Força', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Rosca com garrafas', 3, 15, 60, 12, 'Força', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Prancha', 2, 45, 30, 5, 'Core', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Burpee', 3, 10, 45, 10, 'Cardio', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Afundo com mochila', 3, 12, 90, 10, 'Força', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Mountain climbers', 3, 20, 45, 8, 'Cardio', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Supino com halteres', 3, 10, 90, 12, 'Força', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Puxada na lat', 3, 10, 90, 12, 'Força', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Leg press', 3, 12, 90, 12, 'Força', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Esteira', 1, 30, 0, 30, 'Cardio', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Bicicleta', 1, 25, 0, 25, 'Cardio', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Escada', 1, 20, 0, 20, 'Cardio', 'Academia', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Caminhada', 1, 45, 0, 45, 'Cardio', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v='),
        ('Corrida rua', 1, 30, 0, 30, 'Cardio', 'Casa', 'Iniciante', 'https://www.youtube.com/watch?v=')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Exercícios carregados!');

    // Inserir cardio
    await client.query(`
      INSERT INTO cardio (tipo, local, duracao_minutos, intensidade)
      VALUES 
        ('Esteira', 'Academia', 30, 'Moderada'),
        ('Bicicleta', 'Academia', 25, 'Moderada'),
        ('Escada', 'Academia', 20, 'Alta'),
        ('Caminhada', 'Casa', 45, 'Leve'),
        ('Corrida rua', 'Casa', 30, 'Moderada')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Cardio carregado!');

    // Inserir fases de treino
    await client.query(`
      INSERT INTO fases_treino (numero_fase, nivel, progressao_tipo, multiplicador_dificuldade)
      VALUES 
        (1, 'Iniciante', '+2 reps', 1.0),
        (2, 'Iniciante', '+3 reps', 1.1),
        (3, 'Iniciante', '+3 séries', 1.2),
        (4, 'Intermediário', 'Novos exercícios', 1.3),
        (5, 'Intermediário', '+2 séries', 1.4),
        (6, 'Intermediário', '+3 reps', 1.5),
        (7, 'Avançado', 'Variações', 1.6),
        (8, 'Avançado', 'Técnicas avançadas', 1.7),
        (9, 'Avançado', '+peso', 1.8),
        (10, 'Avançado', 'Progressão contínua', 1.9)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Fases de treino carregadas!');

    client.release(); // Libera conexão, NÃO fecha o pool!
    console.log('✅ PRONTO! Banco inicializado com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
    process.exit(1);
  }
}

// Exportar sem fechar!
module.exports = { pool, initDatabase };