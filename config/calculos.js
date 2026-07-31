// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES DE CÁLCULO - Reutilizáveis em todo o projeto
// ═══════════════════════════════════════════════════════════════════

const ACTIVITY_MULTIPLIER = {
  'Sedentário': 1.2,
  'Leve': 1.375,
  'Moderado': 1.55,
  'Intenso': 1.725,
  'Muito intenso': 1.9
};

const GOAL_ADJUSTMENT = {
  'Emagrecimento': 0.80,
  'Hipertrofia': 1.12,
  'Definição muscular': 0.97
};

// ═══════════════════════════════════════════════════════════════════
// BMR - Basal Metabolic Rate (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function calcBMR(sexo, peso, altura, idade) {
  if (!sexo || !peso || !altura || !idade) {
    throw new Error('Dados incompletos para calcular BMR');
  }

  if (sexo === 'Masculino') {
    return 10 * peso + 6.25 * altura - 5 * idade + 5;
  } else if (sexo === 'Feminino') {
    return 10 * peso + 6.25 * altura - 5 * idade - 161;
  } else {
    throw new Error('Sexo inválido');
  }
}

// ═══════════════════════════════════════════════════════════════════
// TDEE - Total Daily Energy Expenditure (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function calcTDEE(sexo, peso, altura, idade, rotina) {
  if (!rotina || !ACTIVITY_MULTIPLIER[rotina]) {
    throw new Error('Atividade física inválida');
  }

  const bmr = calcBMR(sexo, peso, altura, idade);
  const multiplier = ACTIVITY_MULTIPLIER[rotina];
  return Math.round(bmr * multiplier);
}

// ═══════════════════════════════════════════════════════════════════
// CALORIAS ALVO (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function calcCaloriasAlvo(tdee, objetivo) {
  if (!objetivo || !GOAL_ADJUSTMENT[objetivo]) {
    throw new Error('Objetivo inválido');
  }

  const adjustment = GOAL_ADJUSTMENT[objetivo];
  return Math.round(tdee * adjustment);
}

// ═══════════════════════════════════════════════════════════════════
// MACRONUTRIENTES (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function calcMacros(peso, objetivo, calorias) {
  let proteina, carbo, gordura;

  if (objetivo === 'Emagrecimento') {
    // Proteína alta para preservar músculo
    proteina = Math.round(peso * 2.2);
    gordura = Math.round((calorias * 0.22) / 9);
    const carbCal = calorias - (proteina * 4) - (gordura * 9);
    carbo = Math.round(carbCal / 4);
  } 
  else if (objetivo === 'Hipertrofia') {
    // Carboidrato alto para ganho de massa
    proteina = Math.round(peso * 1.7);
    gordura = Math.round((calorias * 0.20) / 9);
    const carbCal = calorias - (proteina * 4) - (gordura * 9);
    carbo = Math.round(carbCal / 4);
  } 
  else if (objetivo === 'Definição muscular') {
    // Proteína moderada-alta, gordura moderada
    proteina = Math.round(peso * 2.0);
    gordura = Math.round((calorias * 0.25) / 9);
    const carbCal = calorias - (proteina * 4) - (gordura * 9);
    carbo = Math.round(carbCal / 4);
  }
  else {
    throw new Error('Objetivo inválido para cálculo de macros');
  }

  return { proteina, carbo, gordura };
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO COMPLETA - Calcular Protocolo (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function calcularProtocolo(sexo, peso, altura, idade, rotina, objetivo) {
  try {
    const tdee = calcTDEE(sexo, peso, altura, idade, rotina);
    const calorias = calcCaloriasAlvo(tdee, objetivo);
    const macros = calcMacros(peso, objetivo, calorias);

    return {
      tdee: Math.round(tdee),
      calorias_alvo: calorias,
      proteina_g: macros.proteina,
      carbo_g: macros.carbo,
      gordura_g: macros.gordura
    };
  } catch (err) {
    throw new Error(`Erro ao calcular protocolo: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// VALIDAÇÕES (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function validarDados(dados) {
  const erros = [];

  if (!dados.nome || dados.nome.length < 2) {
    erros.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (!dados.idade || dados.idade < 15 || dados.idade > 120) {
    erros.push('Idade deve estar entre 15 e 120 anos');
  }

  if (!dados.peso_atual || dados.peso_atual < 30 || dados.peso_atual > 250) {
    erros.push('Peso deve estar entre 30 e 250 kg');
  }

  if (!dados.altura || dados.altura < 140 || dados.altura > 230) {
    erros.push('Altura deve estar entre 140 e 230 cm');
  }

  if (!['Masculino', 'Feminino'].includes(dados.sexo)) {
    erros.push('Sexo inválido');
  }

  if (!Object.keys(GOAL_ADJUSTMENT).includes(dados.objetivo)) {
    erros.push('Objetivo inválido');
  }

  if (!['Iniciante', 'Intermediário', 'Avançado'].includes(dados.nivel)) {
    erros.push('Nível inválido');
  }

  if (!Object.keys(ACTIVITY_MULTIPLIER).includes(dados.rotina)) {
    erros.push('Atividade inválida');
  }

  if (!dados.dias_treino || dados.dias_treino < 2 || dados.dias_treino > 6) {
    erros.push('Dias de treino deve estar entre 2 e 6');
  }

  if (!dados.refeicoes || dados.refeicoes < 3 || dados.refeicoes > 6) {
    erros.push('Refeições deve estar entre 3 e 6');
  }

  return erros;
}

// ═══════════════════════════════════════════════════════════════════
// GERADOR DE CÓDIGO (EXISTENTE)
// ═══════════════════════════════════════════════════════════════════

function gerarCodigo(tamanho = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < tamanho; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

// ═══════════════════════════════════════════════════════════════════
// ✨ NOVAS FUNÇÕES - DIETA, TREINO, CARDIO
// ═══════════════════════════════════════════════════════════════════

// 1. DISTRIBUIR CALORIAS POR REFEIÇÃO
function distribuirCaloriasRefeicoes(calorias_totais, num_refeicoes) {
  // Percentuais de calorias por refeição conforme quantidade
  const distribuicao = {
    3: [0.20, 0.50, 0.30],                    // café, almoço, janta
    4: [0.15, 0.35, 0.35, 0.15],              // café, almoço, lanche, janta
    5: [0.15, 0.10, 0.40, 0.20, 0.15],        // café, lanche1, almoço, lanche2, janta
    6: [0.12, 0.08, 0.38, 0.12, 0.20, 0.10]   // café, lanche1, almoço, lanche2, café tarde, janta
  };

  const percentuais = distribuicao[num_refeicoes] || distribuicao[3];
  const calorias_refeicoes = percentuais.map(p => Math.round(calorias_totais * p));

  return calorias_refeicoes;
}

// 2. DISTRIBUIR MACROS POR REFEIÇÃO
function distribuirMacrosRefeicoes(macros_totais, num_refeicoes) {
  // Distribui os macros de forma aproximada igual nas refeições
  const proteina_por_refeicao = Math.round(macros_totais.proteina / num_refeicoes);
  const carbo_por_refeicao = Math.round(macros_totais.carbo / num_refeicoes);
  const gordura_por_refeicao = Math.round(macros_totais.gordura / num_refeicoes);

  const macros_refeicoes = [];
  for (let i = 0; i < num_refeicoes; i++) {
    macros_refeicoes.push({
      proteina: proteina_por_refeicao,
      carbo: carbo_por_refeicao,
      gordura: gordura_por_refeicao
    });
  }

  return macros_refeicoes;
}

// 3. NOMES DAS REFEIÇÕES
function getNomesRefeicoes(num_refeicoes) {
  const nomes = {
    3: ['Café da Manhã', 'Almoço', 'Janta'],
    4: ['Café da Manhã', 'Almoço', 'Lanche', 'Janta'],
    5: ['Café da Manhã', 'Lanche Manhã', 'Almoço', 'Lanche Tarde', 'Janta'],
    6: ['Café da Manhã', 'Lanche Manhã', 'Almoço', 'Lanche Tarde', 'Café da Tarde', 'Janta']
  };

  return nomes[num_refeicoes] || nomes[3];
}

// 4. CALCULAR PRÓXIMA FASE
function calcularProximaFase(fase_atual, nivel_aluno) {
  const fase_proxima = fase_atual + 1;
  
  let novo_nivel = nivel_aluno;
  if (fase_atual === 3) novo_nivel = 'Intermediário';
  if (fase_atual === 6) novo_nivel = 'Avançado';
  
  return { fase_proxima, novo_nivel };
}

// 5. GERAR ESTRUTURA DE DIETA (sem dados ainda, só estrutura)
function gerarEstruturaDieta(usuario_id, calorias_alvo, num_refeicoes, macros_totais) {
  const calorias_refeicoes = distribuirCaloriasRefeicoes(calorias_alvo, num_refeicoes);
  const macros_refeicoes = distribuirMacrosRefeicoes(macros_totais, num_refeicoes);
  const nomes_refeicoes = getNomesRefeicoes(num_refeicoes);

  const dieta = {
    usuario_id,
    refeicoes: [],
    gerada_em: new Date(),
    calorias_total: calorias_alvo,
    macros_total: macros_totais
  };

  for (let i = 0; i < num_refeicoes; i++) {
    dieta.refeicoes.push({
      numero: i + 1,
      nome: nomes_refeicoes[i],
      calorias_alvo: calorias_refeicoes[i],
      macros: macros_refeicoes[i],
      opcoes: [] // Será preenchida com dados do banco
    });
  }

  return dieta;
}

// 6. GERAR ESTRUTURA DE TREINO (sem dados ainda, só estrutura)
function gerarEstruturaTreino(usuario_id, dias_treino, tempo_minuto, local, nivel, objetivo) {
  const tempo_por_dia = Math.round(tempo_minuto / dias_treino);

  const treino = {
    usuario_id,
    dias: [],
    gerada_em: new Date(),
    dias_total: dias_treino,
    tempo_total_minutos: tempo_minuto,
    tempo_por_dia: tempo_por_dia,
    local,
    nivel,
    objetivo
  };

  for (let dia = 1; dia <= dias_treino; dia++) {
    treino.dias.push({
      numero: dia,
      tempo_disponivel_minutos: tempo_por_dia,
      exercicios: [] // Será preenchida com dados do banco
    });
  }

  return treino;
}

// 7. GERAR ESTRUTURA DE CARDIO
function gerarEstruturacardio(usuario_id, local, objetivo, dias_treino) {
  const intensidade_map = {
    'Emagrecimento': 'Moderada a Alta',
    'Hipertrofia': 'Leve a Moderada',
    'Definição muscular': 'Moderada'
  };

  return {
    usuario_id,
    local,
    objetivo,
    intensidade: intensidade_map[objetivo] || 'Moderada',
    dias_cardio: [], // Será preenchida com dados do banco
    dias_semana: dias_treino
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTAR TUDO
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  // Existentes
  calcBMR,
  calcTDEE,
  calcCaloriasAlvo,
  calcMacros,
  calcularProtocolo,
  validarDados,
  gerarCodigo,
  ACTIVITY_MULTIPLIER,
  GOAL_ADJUSTMENT,
  
  // Novas
  distribuirCaloriasRefeicoes,
  distribuirMacrosRefeicoes,
  getNomesRefeicoes,
  calcularProximaFase,
  gerarEstruturaDieta,
  gerarEstruturaTreino,
  gerarEstruturacardio
};