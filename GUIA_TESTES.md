# 🧪 Guia de Testes - SculptX Plataforma

Complete este guia antes de fazer deploy para produção.

---

## ⚡ Teste 1: Setup Básico

### 1.1 Instalar Dependências

```bash
npm install
```

**✅ Esperado:** Sem erros, pasta `node_modules/` criada

---

### 1.2 Configurar Banco de Dados

```bash
# Criar banco
createdb sculptx_db

# Testar conexão
psql postgresql://seu_usuario:sua_senha@localhost:5432/sculptx_db
```

**✅ Esperado:** Conexão bem-sucedida

---

### 1.3 Configurar .env

```bash
cp .env.example .env
```

**Editar .env com:**
```
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/sculptx_db
PORT=3000
NODE_ENV=development
ADMIN_PASSWORD=senha_teste_123
ALLOWED_ORIGINS=*
```

---

## 🚀 Teste 2: Iniciar Servidor

```bash
npm run dev
```

**✅ Esperado:**
```
✅ Conectado ao PostgreSQL
🔧 Inicializando banco de dados...
✅ Banco de dados inicializado com sucesso
🔐 Admin padrão criado: admin / 01010924Clo#
⚠️  MUDE A SENHA NO PAINEL ADMIN ASSIM QUE SUBIR!
🚀 SculptX Plataforma iniciado!
📍 URL: http://localhost:3000
🔐 Admin: http://localhost:3000/admin
```

---

## 📱 Teste 3: Fluxo Completo do Usuário

### 3.1 Acessar Login

1. Abrir: http://localhost:3000
2. **✅ Esperado:** Página com logo SculptX, input de código, link WhatsApp

### 3.2 Tentar Código Inválido

1. Digitar qualquer código (ex: `INVALIDO`)
2. Clicar "Acessar Plataforma"
3. **✅ Esperado:** Erro "Código inválido ou expirado"

### 3.3 Gerar Código no Admin

1. Abrir: http://localhost:3000/admin
2. Digitar senha: `senha_teste_123`
3. Clicar "Entrar"
4. **✅ Esperado:** Dashboard admin carregado
5. Ir para **Códigos**
6. Clicar "+ Gerar Novo"
7. Deixar duração = 60 dias
8. Clicar "Gerar"
9. **✅ Esperado:** Código gerado (ex: `ABC12XYZ9`)
10. Copiar código

### 3.4 Acessar com Código Válido

1. Voltar para: http://localhost:3000
2. Colar código gerado
3. Clicar "Acessar Plataforma"
4. **✅ Esperado:** Redirecionado para onboarding

### 3.5 Preencher Onboarding

1. Preencher todos os campos:
   - Nome: `João Silva`
   - Idade: `30`
   - Sexo: `Masculino`
   - Altura: `180`
   - Peso Atual: `85`
   - Peso Alvo: `80`
   - Objetivo: `Hipertrofia`
   - Nível: `Avançado`
   - Atividade: `Moderado`
   - Dias Treino: `4`
   - Tempo: `60-90 min`
   - Refeições: `5`

2. Clicar "Gerar Meu Protocolo"

3. **✅ Esperado:** Redirecionado para dashboard com dados

### 3.6 Verificar Dashboard

**✅ Esperado:**
- Nome: "João Silva" aparece
- Objetivo: "Hipertrofia"
- Nível: "Avançado"
- Dias: "4 dias"
- **CALORIAS CALCULADAS AUTOMATICAMENTE** (ex: ~2800-3200)
- **PROTEÍNA** (ex: ~143g - baseado em 1.7g/kg para hipertrofia)
- **CARBOIDRATO** (ex: ~350-400g - alto para hipertrofia)
- **GORDURA** (ex: ~80-90g - 20% das calorias)

### 3.7 Testar Logout

1. Clicar botão "Sair"
2. **✅ Esperado:** Volta para página de login

---

## 🔐 Teste 4: Painel Admin

### 4.1 Dashboard Admin

1. Acessar: http://localhost:3000/admin
2. Entrar com senha
3. **✅ Esperado:**
   - Estatísticas visíveis
   - Codigos ativos: 1+
   - Usuários total: 1+
   - Botões de ação funcionando

### 4.2 Gerenciar Códigos

1. Ir para **Códigos**
2. **✅ Esperado:**
   - Lista de códigos gerados
   - Status (Ativo/Inativo)
   - Botão desativar funciona
   - Gerar novo código funciona

### 4.3 Listar Usuários

1. Ir para **Usuários**
2. **✅ Esperado:**
   - Tabela com usuários
   - Nome, objetivo, nível, código
   - Data de cadastro correta

---

## 🧮 Teste 5: Cálculos

### 5.1 Verificar Cálculos TDEE

**Entrada:**
- Idade: 30
- Sexo: Masculino
- Peso: 85kg
- Altura: 180cm
- Atividade: Moderado

**Cálculo esperado:**
1. BMR = 10×85 + 6.25×180 - 5×30 + 5 = **1,847.5**
2. TDEE = 1,847.5 × 1.55 = **2,863.6**
3. Arredondado: **2,864**

### 5.2 Verificar Macros Hipertrofia

**Para TDEE 2,864 e Hipertrofia (85kg):**
- Proteína: 85 × 1.7 = **144g**
- Calorias Alvo: 2,864 × 1.12 = **3,207**
- Gordura: 3,207 × 0.20 / 9 = **71g**
- Carboidrato: (3,207 - 576 - 639) / 4 = **497g**

**Teste:**
1. Preencher com esses dados
2. **✅ Esperado:** Números batem (±5% de diferença)

### 5.3 Testar Mudança de Objetivo

1. Fazer onboarding com **Emagrecimento**
2. **✅ Esperado:**
   - Calorias = TDEE × 0.80 (menos)
   - Proteína = 2.2g/kg (mais que hipertrofia)
   - Carboidrato = menor
   - Gordura = 22% (mais contenção)

---

## 🌐 Teste 6: Responsividade

### 6.1 Mobile (360px)

1. Abrir DevTools (F12)
2. Modo dispositivo: **iPhone SE**
3. **✅ Esperado:**
   - Botões legíveis
   - Inputs completamente acessíveis
   - Sem scroll horizontal
   - Layout em coluna única

### 6.2 Tablet (768px)

1. Modo dispositivo: **iPad**
2. **✅ Esperado:**
   - Stats em 2 colunas
   - Nutrition em 2 colunas
   - Ferramentas em 1-2 colunas

### 6.3 Desktop (1400px)

1. Modo dispositivo: **Desktop 1400px**
2. **✅ Esperado:**
   - Stats em 3 colunas
   - Nutrition em 4 colunas
   - Ferramentas em 3 colunas
   - Layout profissional

---

## 🔗 Teste 7: Validações

### 7.1 Código Inválido

- [ ] Código vazio → erro
- [ ] Código muito curto (1 char) → erro
- [ ] Código com espacos → trimado
- [ ] Código maiúsculas/minúsculas → convertido

### 7.2 Onboarding Inválido

- [ ] Nome vazio → erro
- [ ] Idade < 15 → erro
- [ ] Idade > 120 → erro
- [ ] Peso < 30 → erro
- [ ] Peso > 250 → erro
- [ ] Altura < 140 → erro
- [ ] Altura > 230 → erro
- [ ] Sexo inválido → erro
- [ ] Objetivo inválido → erro
- [ ] Nível inválido → erro

---

## 📊 Teste 8: Banco de Dados

### 8.1 Tabelas Criadas

```bash
psql -U seu_usuario -d sculptx_db -c "\dt"
```

**✅ Esperado tabelas:**
- [ ] admin
- [ ] codigos
- [ ] usuarios
- [ ] progresso
- [ ] logs

### 8.2 Dados Persistem

1. Criar usuário
2. Fechar servidor
3. Iniciar servidor novamente
4. Acessar mesmo código
5. **✅ Esperado:** Dados intactos (vai direto para dashboard)

---

## 🚨 Teste 9: Tratamento de Erros

### 9.1 Erro de Conexão

1. Desligar PostgreSQL
2. Tentar acessar login
3. **✅ Esperado:** Mensagem de erro clara (não crash)
4. Ligar PostgreSQL novamente
5. Recarregar página
6. **✅ Esperado:** Funciona normalmente

### 9.2 Erro de API

1. Abrir DevTools (Console)
2. Testar requisição manual:
```javascript
fetch('/api/check-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ codigo: 'TESTE' })
}).then(r => r.json()).then(console.log)
```

3. **✅ Esperado:** Response JSON estruturado (ok: true/false)

---

## 🎯 Checklist Final

Antes de fazer deploy, confirme:

- [ ] Servidor inicia sem erros
- [ ] Login funciona com código válido
- [ ] Login rejeita código inválido
- [ ] Onboarding salva dados
- [ ] Dashboard mostra dados corretos
- [ ] Cálculos TDEE/macros corretos
- [ ] Admin gera códigos
- [ ] Admin desativa códigos
- [ ] Admin lista usuários
- [ ] Interface responsiva (mobile/tablet/desktop)
- [ ] Validações funcionam
- [ ] Erros são tratados graciosamente
- [ ] Banco de dados persiste dados
- [ ] Logout funciona
- [ ] WhatsApp link funciona

---

## 🚀 Após Todos os Testes

Faça commit com confiança:

```bash
git add .
git commit -m "SculptX Plataforma - FASE 1 testado e pronto"
git push origin main
```

**Próximo passo:** Deploy no Render! 🌐

---

## 📝 Notas

- Senhas de teste podem ser alteradas a qualquer momento
- Dados de teste podem ser deletados do banco
- Verificar logs regularmente para erros
- Fazer backups do banco de dados em produção
