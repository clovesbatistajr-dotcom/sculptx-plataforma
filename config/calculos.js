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
// BMR - Basal Metabolic Rate
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
// TDEE - Total Daily Energy Expenditure
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
// CALORIAS ALVO (com ajuste por objetivo)
// ═══════════════════════════════════════════════════════════════════

function calcCaloriasAlvo(tdee, objetivo) {
  if (!objetivo || !GOAL_ADJUSTMENT[objetivo]) {
    throw new Error('Objetivo inválido');
  }

  const adjustment = GOAL_ADJUSTMENT[objetivo];
  return Math.round(tdee * adjustment);
}

// ═══════════════════════════════════════════════════════════════════
// MACRONUTRIENTES - Proteína, Carboidrato, Gordura
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
// FUNÇÃO COMPLETA - Calcular Tudo
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
// VALIDAÇÕES
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
// GERADOR DE CÓDIGO
// ═══════════════════════════════════════════════════════════════════

function gerarCodigo(tamanho = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < tamanho; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

module.exports = {
  calcBMR,
  calcTDEE,
  calcCaloriasAlvo,
  calcMacros,
  calcularProtocolo,
  validarDados,
  gerarCodigo,
  ACTIVITY_MULTIPLIER,
  GOAL_ADJUSTMENT
};
