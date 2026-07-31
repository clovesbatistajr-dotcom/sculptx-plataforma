# 🚀 SculptX - Plataforma Inteligente

**Versão:** 2.0.0 - FASE 1 COMPLETA  
**Status:** Production-Ready  
**Última atualização:** Julho 2026

Sistema completo de protocolo de treino, dieta e suplementação personalizado com painel de administração.

---

## 📋 Índice

1. [Sobre o Projeto](#sobre)
2. [Funcionalidades](#funcionalidades)
3. [Instalação Local](#instalação-local)
4. [Deploy no Render](#deploy-no-render)
5. [Estrutura do Projeto](#estrutura)
6. [APIs Disponíveis](#apis)
7. [Painel Admin](#admin)
8. [Segurança](#segurança)
9. [Troubleshooting](#troubleshooting)

---

## <a name="sobre"></a>📖 Sobre o Projeto

**SculptX** é uma plataforma web profissional que permite oferecer protocolos personalizados de treino, dieta e suplementação para alunos de forma automatizada.

### Principais Diferenciais

✅ *Totalmente Profissional* - Arquitetura escalável e segura  
✅ *Painel Admin Completo* - Gerenciar códigos e usuários  
✅ *Cálculos Inteligentes* - TDEE e macronutrientes automáticos  
✅ *Design Responsivo* - Funciona em mobile, tablet e desktop  
✅ *Fácil Deployment* - Render em 5 minutos  
✅ *Banco de Dados PostgreSQL* - Dados seguros e persistentes  

---

## <a name="funcionalidades"></a>✨ Funcionalidades - FASE 1

### Públicas (Usuário)

- ✅ Login por código único (validação de código)
- ✅ Onboarding completo (coleta de 14 dados diferentes)
- ✅ Cálculo automático de TDEE e macronutrientes
- ✅ Dashboard personalizado com dados do usuário
- ✅ Exibição de protocolo nutricional diário
- ✅ Interface responsiva e intuitiva

### Admin

- ✅ Painel administrativo com senha
- ✅ Gerar códigos de acesso (automáticos)
- ✅ Listar todos os códigos e seus status
- ✅ Desativar códigos individualmente
- ✅ Listar todos os usuários cadastrados
- ✅ Ver detalhes de cada usuário
- ✅ Dashboard com estatísticas
- ✅ Rastreamento de ações

### Próximas Fases (FASE 2-4)

- 📅 Treino: 30 fases progressivas × 3 objetivos × 3 níveis
- 📅 Dieta: Estrutura de fases com refeições clicáveis
- 📅 Suplementação: Protocolo automático de whey, ômega, creatina, multivitamínico

---

## <a name="instalação-local"></a>💻 Instalação Local (Desenvolvimento)

### Pré-requisitos

- Node.js 14+
- PostgreSQL 12+
- Git

### Passo 1: Clonar o Projeto

```bash
git clone https://github.com/seu-usuario/sculptx-plataforma.git
cd sculptx-plataforma
```

### Passo 2: Instalar Dependências

```bash
npm install
```

### Passo 3: Configurar Banco de Dados

**Criar banco PostgreSQL:**

```bash
# Via terminal
createdb sculptx_db

# Ou via interface gráfica (pgAdmin)
# Criar novo database: sculptx_db
```

### Passo 4: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com seus dados
# DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/sculptx_db
# ADMIN_PASSWORD=sua_senha_super_segura
```

### Passo 5: Rodar Localmente

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

**Acesse:**
- 🌐 Interface: http://localhost:3000
- 🔐 Admin: http://localhost:3000/admin
- 📊 Health Check: http://localhost:3000/health

---

## <a name="deploy-no-render"></a>🌐 Deploy no Render (5 minutos)

### Passo 1: Preparar GitHub

```bash
git add .
git commit -m "SculptX Plataforma - FASE 1"
git branch -M main
git remote add origin https://github.com/seu-usuario/sculptx-plataforma.git
git push -u origin main
```

### Passo 2: Criar PostgreSQL no Render

1. Ir para [render.com](https://render.com)
2. Fazer login com GitHub
3. **New +** → **PostgreSQL**
4. Preencher:
   - Name: `sculptx-db`
   - Database: `sculptx_db`
   - Region: São Paulo (SP)
5. Clicar **Create Database**
6. **Copiar a URL interna** (será usada no próximo passo)

### Passo 3: Criar Web Service

1. **New +** → **Web Service**
2. Selecionar seu repositório `sculptx-plataforma`
3. Preencher:
   - Name: `sculptx-plataforma`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Clicar **Create Web Service**

### Passo 4: Adicionar Variáveis de Ambiente

Na seção **Environment** do Web Service:

```
DATABASE_URL=postgresql://...  (cola a URL do PostgreSQL)
NODE_ENV=production
ADMIN_PASSWORD=sua_senha_forte
ALLOWED_ORIGINS=https://seudominio.com
```

### Passo 5: Pronto! 🎉

Render faz o deploy automaticamente. Verificar os **Logs** para confirmar sucesso.

**URL pública:** `https://sculptx-plataforma.onrender.com`

---

## <a name="estrutura"></a>📁 Estrutura do Projeto

```
sculptx-plataforma/
├── config/
│   ├── database.js          ← Conexão PostgreSQL + inicialização
│   └── calculos.js          ← Funções de cálculo (TDEE, macros, etc)
├── middleware/
│   └── auth.js              ← Autenticação admin
├── public/
│   ├── index.html           ← Login por código
│   ├── onboarding.html      ← Coleta de dados
│   ├── dashboard.html       ← Página principal do usuário
│   ├── admin.html           ← Painel de administração
│   └── style.css            ← Estilos globais
├── server.js                ← Backend principal (Express + APIs)
├── package.json             ← Dependências
├── .env.example             ← Template de configuração
├── .gitignore               ← Arquivos ignorados no Git
└── README.md                ← Este arquivo
```

---

## <a name="apis"></a>🔌 APIs Disponíveis

### Públicas (Sem Autenticação)

#### 1. Verificar Código
```
POST /api/check-code
Body: { codigo: "ABC123XYZ" }
Response: { ok: true, codigo_id: 1, temUsuario: false, duracao_dias: 60 }
```

#### 2. Salvar Onboarding
```
POST /api/onboarding
Body: {
  codigo_id: 1,
  nome: "João Silva",
  idade: 30,
  peso_atual: 85,
  peso_alvo: 80,
  altura: 180,
  sexo: "Masculino",
  objetivo: "Hipertrofia",
  nivel: "Avançado",
  rotina: "Moderado",
  dias_treino: 4,
  tempo_treino: "60-90 min",
  refeicoes: 5
}
Response: {
  ok: true,
  usuario_id: 1,
  tdee: 2800,
  calorias_alvo: 3136,
  proteina_g: 145,
  carbo_g: 390,
  gordura_g: 70
}
```

#### 3. Puxar Dados do Usuário
```
GET /api/usuario/:codigo_id
Response: {
  ok: true,
  usuario: { ... },
  progresso: [ ... ]
}
```

### Admin (Requer Autenticação)

Todos os endpoints admin precisam do header:
```
x-admin-password: sua_senha_admin
```

#### 1. Gerar Código
```
POST /api/admin/gerar-codigo
Body: { duracao_dias: 60, notas: "Cliente XYZ" }
Response: {
  ok: true,
  codigo: "ABC12XYZ9",
  vencimento: "2026-09-29T...",
  duracao_dias: 60
}
```

#### 2. Listar Códigos
```
GET /api/admin/codigos
Response: {
  ok: true,
  codigos: [
    { id: 1, codigo: "ABC123XYZ", ativo: true, ... }
  ]
}
```

#### 3. Desativar Código
```
POST /api/admin/desativar-codigo/:id
Response: { ok: true, mensagem: "Código desativado" }
```

#### 4. Listar Usuários
```
GET /api/admin/usuarios
Response: {
  ok: true,
  usuarios: [ ... ],
  total: 42
}
```

#### 5. Dashboard Admin
```
GET /api/admin/dashboard
Response: {
  ok: true,
  stats: {
    codigos_ativos: 25,
    usuarios_total: 42,
    codigos_ultimo_mes: 8
  }
}
```

---

## <a name="admin"></a>🔐 Painel Admin

### Como Acessar

1. Ir para: `https://seudominio.com/admin`
2. Digitar senha: `(ADMIN_PASSWORD do .env)`

### Funcionalidades

**📊 Dashboard**
- Estatísticas em tempo real
- Ações rápidas

**🔑 Códigos**
- Gerar novos códigos (automático)
- Listar todos os códigos
- Ver quantos usuários por código
- Desativar códigos individualmente
- Copiar código gerado

**👥 Usuários**
- Listar todos os usuários
- Ver dados pessoais
- Objetivo e nível
- Data de cadastro

---

## <a name="segurança"></a>🔒 Segurança

### Implementado

✅ Helmet.js (headers de segurança)  
✅ CORS configurável  
✅ Validação de inputs  
✅ Autenticação via senha do admin  
✅ HTTPS automático no Render  
✅ SSL/TLS automático  

### Para Melhorar (Produção)

1. **JWT para Admin** - Mudar autenticação simples por JWT tokens
2. **Bcrypt** - Hash de senhas do admin
3. **Rate Limiting** - Proteção contra brute force
4. **Validação Avançada** - Mais rigorosa no backend
5. **Logs de Segurança** - Registrar todas as ações

---

## <a name="troubleshooting"></a>🆘 Troubleshooting

### "Erro de conexão com banco de dados"

**Verificar:**
1. PostgreSQL está rodando?
2. Banco de dados existe? (`createdb sculptx_db`)
3. URL do DATABASE_URL está correta?

**Testar:**
```bash
psql postgresql://user:pass@localhost:5432/sculptx_db
```

### "Código inválido ou expirado"

- Gerar novo código no painel admin
- Verificar se data de vencimento passou
- Código está ativo?

### "Erro ao calcular protocolo"

- Verificar se todos os campos foram preenchidos
- Validar tipos de dados (número vs texto)
- Revisar formulário de onboarding

### "Painel admin não funciona"

- Verificar ADMIN_PASSWORD no .env
- Confirmar se está no ambiente correto
- Limpar cache do navegador (Ctrl+Shift+Del)

### Deploy no Render falha

1. Ver **Logs** detalhados
2. Verificar se DATABASE_URL está correta
3. Executar localmente primeiro: `npm start`
4. Testar build: `npm install` funciona?

---

## 📞 Suporte

**Clóves - Personal Trainer**  
📱 WhatsApp: +55 38 99829-8303  
💬 [Enviar Mensagem](https://wa.me/5538998298303)

---

## 📝 Changelog

### v2.0.0 (Julho 2026)
- ✅ Arquitetura profissional completa
- ✅ Painel admin totalmente funcional
- ✅ APIs bem documentadas
- ✅ Validações robustas
- ✅ Deploy no Render testado

### v1.0.0 (Junho 2026)
- Versão inicial (interativa)

---

## 📄 Licença

MIT License - Desenvolvido para SculptX  
Copyright © 2026 Clóves Pereira

---

**Desenvolvido com ❤️ para transformar vidas através do fitness**
