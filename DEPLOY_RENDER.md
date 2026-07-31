# 🚀 Deploy SculptX no Render.com

Guia passo a passo para colocar sua plataforma online em 5 minutos.

---

## ✅ PRÉ-REQUISITOS

- [ ] Conta no GitHub
- [ ] Repositório com o código
- [ ] Conta no Render (login com GitHub)
- [ ] Projeto testado localmente (ver GUIA_TESTES.md)

---

## 📚 ÍNDICE

1. [Preparar GitHub](#github)
2. [Criar PostgreSQL](#postgresql)
3. [Criar Web Service](#webservice)
4. [Configurar Variáveis](#variaveis)
5. [Deploy](#deploy)
6. [Verificar](#verificar)
7. [Domínio Customizado](#dominio)

---

## <a name="github"></a>✅ PASSO 1: Preparar GitHub

### 1.1 Criar Repositório

1. Ir para [github.com/new](https://github.com/new)
2. Nome: `sculptx-plataforma`
3. Descrição: `SculptX - Plataforma Inteligente de Treino, Dieta e Suplementação`
4. Privado (recomendado)
5. Clicar **Create Repository**

### 1.2 Fazer Push do Código

```bash
cd /caminho/para/sculptx-plataforma

# Inicializar git (se não existir)
git init
git add .
git commit -m "SculptX Plataforma - FASE 1 Completa"

# Configurar remote
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sculptx-plataforma.git

# Fazer push
git push -u origin main
```

**✅ Esperado:** Código no GitHub com commit visível

---

## <a name="postgresql"></a>🗄️ PASSO 2: Criar PostgreSQL no Render

### 2.1 Acessar Render

1. Ir para [render.com](https://render.com)
2. Clicar **Sign Up** ou **Sign In with GitHub**
3. Conectar com sua conta GitHub

### 2.2 Criar Database

1. No dashboard, clicar **New +** (canto superior direito)
2. Selecionar **PostgreSQL**
3. Preencher formulário:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `sculptx-db` |
   | **Database** | `sculptx_db` |
   | **User** | `sculptx_user` |
   | **Region** | São Paulo (SP) |
   | **PostgreSQL Version** | 15 (ou latest) |
   | **Datadog API Key** | Deixar vazio |

4. Clicar **Create Database**

### 2.3 Copiar String de Conexão

1. Aguardar database ser criado (2-3 min)
2. Na página do database, procurar por:
   - **Internal Database URL** ou **External Database URL**
3. Copiar a URL que começa com `postgresql://`

**Exemplo:**
```
postgresql://sculptx_user:xyz123abc@ohio-postgres.render.com:5432/sculptx_db
```

⚠️ **GUARDAR ESTA URL** - será usada no próximo passo!

---

## <a name="webservice"></a>🌐 PASSO 3: Criar Web Service

### 3.1 Novo Web Service

1. No dashboard Render, clicar **New +**
2. Selecionar **Web Service**
3. Clicar **Connect** no seu repositório `sculptx-plataforma`

### 3.2 Configurar Web Service

Preencher formulário:

| Campo | Valor |
|-------|-------|
| **Name** | `sculptx-plataforma` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` (para começar) |

3. Clicar **Create Web Service**

⏳ Render vai fazer o build (2-5 min)

---

## <a name="variaveis"></a>🔐 PASSO 4: Adicionar Variáveis de Ambiente

### 4.1 Acessar Variáveis

1. Na página do Web Service (em construção)
2. Clicar na aba **Environment**
3. Clicar **Add Environment Variable**

### 4.2 Adicionar Variáveis

Adicionar 4 variáveis:

#### Variável 1: DATABASE_URL
- **Key:** `DATABASE_URL`
- **Value:** (Cole a URL do PostgreSQL copiada no Passo 2.3)
- Clicar **Add**

#### Variável 2: NODE_ENV
- **Key:** `NODE_ENV`
- **Value:** `production`
- Clicar **Add**

#### Variável 3: ADMIN_PASSWORD
- **Key:** `ADMIN_PASSWORD`
- **Value:** `sua_senha_super_segura_123` (MUDE ISSO!)
- Clicar **Add**

#### Variável 4: ALLOWED_ORIGINS
- **Key:** `ALLOWED_ORIGINS`
- **Value:** `*` (ou seu domínio se tiver)
- Clicar **Add**

### 4.3 Confirmar

Clicar **Save Changes**

---

## <a name="deploy"></a>🚀 PASSO 5: Deploy

### 5.1 Esperar Render Fazer Deploy

O Render deve:
1. ✅ Fazer git clone
2. ✅ Instalar `npm install`
3. ✅ Rodar `node server.js`

**Tempo estimado:** 3-5 minutos

### 5.2 Ver Logs

1. Na página do Web Service, clicar aba **Logs**
2. Procurar por mensagens:

```
✅ Conectado ao PostgreSQL
🔧 Inicializando banco de dados...
✅ Banco de dados inicializado com sucesso
🚀 SculptX Plataforma iniciado!
```

❌ Se houver erro, ver **Troubleshooting** abaixo

---

## <a name="verificar"></a>✅ PASSO 6: Verificar se Está Online

### 6.1 URL Pública

1. Na página do Web Service, procurar por:
   - Algo como: `https://sculptx-plataforma.onrender.com`
2. Copiar essa URL (será sua URL pública)

### 6.2 Testar Login

1. Abrir: `https://sculptx-plataforma.onrender.com`
2. **✅ Esperado:** Página de login SculptX carregada

### 6.3 Testar Admin

1. Abrir: `https://sculptx-plataforma.onrender.com/admin`
2. Digitar senha: (a senha que colocou em ADMIN_PASSWORD)
3. **✅ Esperado:** Dashboard admin carregado

### 6.4 Gerar Código de Teste

1. No admin, ir para **Códigos**
2. Gerar um código
3. Testar login com esse código
4. Preencher onboarding
5. **✅ Esperado:** Dashboard do usuário com dados calculados

---

## <a name="dominio"></a>🌐 PASSO 7: Domínio Customizado (Opcional)

Se tiver domínio próprio (ex: www.sculptx.com.br):

### 7.1 Acessar Configurações

1. Web Service → Settings (engrenagem)
2. Scroll até **Custom Domain**
3. Clicar **Add Custom Domain**

### 7.2 Adicionar Domínio

1. Digitar seu domínio: `www.sculptx.com.br`
2. Clicar **Add Domain**
3. Render vai fornecer um **CNAME Record**

### 7.3 Configurar DNS

1. Ir para seu registrador (GoDaddy, Namecheap, etc)
2. Acessar DNS do domínio
3. Adicionar CNAME Record:
   - **Host:** `www`
   - **Points to:** (valor fornecido pelo Render)
4. Salvar

⏳ Esperar 5-30 min para propagação

---

## 🆘 TROUBLESHOOTING

### "Build Failed"

**Solução:**
1. Ver logs completos
2. Verificar se `package.json` está na raiz
3. Rodar localmente: `npm install && npm start`
4. Fazer commit dos erros corrigidos
5. Render vai tentar novamente automaticamente

### "Cannot find module"

**Solução:**
1. `npm install` foi executado?
2. Todas as dependências no package.json?
3. Testar: `npm install` local

### "Connection refused (banco de dados)"

**Solução:**
1. DATABASE_URL está correto na variável de ambiente?
2. PostgreSQL foi criado no Render?
3. URL não expirou? (copiar URL fresca do Render)

### "Service fails to start"

**Solução:**
1. Ver **Logs** para erro específico
2. Verificar se PORT está correto (deixar em branco = automático)
3. NODE_ENV está em `production`?

### "Admin page is blank"

**Solução:**
1. Limpar cache: Ctrl+Shift+Del
2. Abrir DevTools: F12 → Console
3. Ver se há erros JavaScript
4. Testar em navegador privado (Ctrl+Shift+N)

---

## 📝 Checklist Final

- [ ] Repositório no GitHub
- [ ] PostgreSQL criado no Render
- [ ] Web Service criado no Render
- [ ] DATABASE_URL adicionada (com URL do PostgreSQL)
- [ ] NODE_ENV = production
- [ ] ADMIN_PASSWORD definida
- [ ] Render fez o deploy (ver Logs)
- [ ] URL pública acessível
- [ ] Login funciona
- [ ] Admin funciona
- [ ] Código pode ser gerado
- [ ] Usuário pode fazer onboarding
- [ ] Macros são calculados

---

## 🎉 PRONTO!

Sua plataforma está online! 🚀

**Próximos passos:**
1. Gerar códigos para seus clientes
2. Clientes acessarem via URL pública
3. Compartilhar link do admin com segurança
4. Implementar FASE 2 (Treino, Dieta, Suplementação)

---

## 💡 DICAS IMPORTANTES

1. **Segurança:**
   - Mude a ADMIN_PASSWORD regularmente
   - Use HTTPS sempre (Render já fornece)
   - Considere adicionar 2FA no GitHub

2. **Manutenção:**
   - Monitore **Metrics** no Render
   - Ver **Logs** regularmente
   - Fazer backups do banco de dados

3. **Performance:**
   - Upgrade de plano se tiver muitos usuários
   - Considere cache Redis para otimização
   - Otimizar queries do banco

4. **Atualizações:**
   - Fazer commit de mudanças
   - Push para GitHub
   - Render faz deploy automaticamente

---

## 📞 Suporte

Dúvidas sobre Render? 
- Docs: [render.com/docs](https://render.com/docs)
- Status: [status.render.com](https://status.render.com)

Dúvidas sobre SculptX?
- WhatsApp: +55 38 99829-8303

---

**Seu app está rodando!** ✅ 🎉
