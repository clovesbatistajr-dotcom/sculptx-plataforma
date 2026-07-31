// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════════

// Verificar se admin está autenticado
function verificarAutenticacao(req, res, next) {
  const senha = req.headers['x-admin-password'] || req.body.admin_password;

  if (!senha) {
    return res.status(401).json({ ok: false, erro: 'Autenticação obrigatória' });
  }

  // Comparação simples (em produção, usar bcrypt!)
  if (senha !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ ok: false, erro: 'Senha inválida' });
  }

  next();
}

// Log de ações
function logarAcao(acao, tabela, dados_id, usuario = 'admin', ip = 'local') {
  // Será registrado no banco de dados
  return {
    acao,
    tabela,
    dados_id,
    usuario,
    ip,
    timestamp: new Date()
  };
}

module.exports = {
  verificarAutenticacao,
  logarAcao
};
