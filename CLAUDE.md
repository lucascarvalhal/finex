# CLAUDE.md - Nexfy Project Context

> Este arquivo mantém o contexto completo do projeto para o Claude Code.
> **SEMPRE leia este arquivo ao iniciar uma nova sessão.**
> Atualize ao final de cada sessão de trabalho.

**Última atualização:** 2026-02-03

---

## O que é o Nexfy?

**Nexfy** é um aplicativo de gestão financeira pessoal com:
- App mobile/web (React Native + Expo)
- Backend API (FastAPI + PostgreSQL)
- Assistente IA via WhatsApp chamada **Nex**
- Reconhecimento de notas fiscais por foto
- Transcrição de áudios
- Login com Google, email/senha ou telefone

---

## Arquitetura de Produção (100% na Nuvem)

```
┌──────────────────────────────────────────────────────────────────┐
│                         USUÁRIO                                  │
│            │                              │                      │
│            ▼                              ▼                      │
│     ┌─────────────┐              ┌──────────────┐                │
│     │  WhatsApp   │              │   App Expo   │                │
│     │  (celular)  │              │  (web/mobile)│                │
│     └─────────────┘              └──────────────┘                │
│            │                              │                      │
│            ▼                              │                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Meta WhatsApp Cloud API                                │    │
│   └─────────────────────────────────────────────────────────┘    │
│            │                              │                      │
│            ▼                              │                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  GCP Cloud Run - WEBHOOK                                │    │
│   │  https://nexfy-webhook-663336797453.southamerica-east1  │    │
│   │  .run.app                                               │    │
│   │                                                         │    │
│   │  - Recebe mensagens do WhatsApp                         │    │
│   │  - Processa texto, áudio e imagens com Gemini           │    │
│   │  - Nex: IA com personalidade humanizada                 │    │
│   └─────────────────────────────────────────────────────────┘    │
│            │                              │                      │
│            ▼                              ▼                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  GCP Cloud Run - BACKEND                                │    │
│   │  https://nexfy-backend-663336797453.southamerica-east1  │    │
│   │  .run.app                                               │    │
│   │                                                         │    │
│   │  - API REST (FastAPI)                                   │    │
│   │  - Autenticação (JWT, Google OAuth, telefone)           │    │
│   │  - CRUD transações, metas, investimentos                │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  SUPABASE PostgreSQL                                    │    │
│   │  aws-1-sa-east-1.pooler.supabase.com:6543               │    │
│   │  Project: uulxkquorddagobccemd                          │    │
│   └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**IMPORTANTE:** Não usamos Docker local em produção. Tudo roda no GCP Cloud Run + Supabase.

---

## URLs e Endpoints

### Produção
| Serviço | URL |
|---------|-----|
| Backend | https://nexfy-backend-663336797453.southamerica-east1.run.app |
| Webhook | https://nexfy-webhook-663336797453.southamerica-east1.run.app |
| Webhook (Meta) | https://nexfy-webhook-663336797453.southamerica-east1.run.app/webhook |
| Frontend | App Expo (local ou build) |

### Banco de Dados (Supabase)
```
Host: aws-1-sa-east-1.pooler.supabase.com
Porta: 6543
Database: postgres
Project Ref: uulxkquorddagobccemd
Connection String: postgresql://postgres.uulxkquorddagobccemd:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

### GCP
```
Projeto: nexfy-486011
Região: southamerica-east1
Conta: lucas.carvalhal.pereira@gmail.com
```

---

## WhatsApp Cloud API (Meta)

### Credenciais
| Campo | Valor |
|-------|-------|
| Phone Number ID | 998730039984529 |
| Business Account ID | 1415027933346400 |
| Display Phone Number | 5511936183690 |
| Verify Token | nexfy_webhook_verify_2024 |
| Access Token | Armazenado no GCP (variável de ambiente) |

### Configuração no Meta Developer Console
1. URL do Webhook: `https://nexfy-webhook-663336797453.southamerica-east1.run.app/webhook`
2. Verify Token: `nexfy_webhook_verify_2024`
3. Campos assinados: `messages`

### Tokens de Acesso
- Tokens temporários expiram rapidamente
- Use **System User Token** para não expirar
- Para gerar: Meta Business Suite → Configurações do negócio → Usuários do sistema → Gerar token

### Problemas Comuns
1. **Token expirado:** Gerar novo token no Meta Developer Console
2. **Permissão negada:** Verificar se o app tem `whatsapp_business_messaging`
3. **Empresa não verificada:** Fazer verificação de negócio no Meta

---

## Nex - Assistente IA

### Personalidade
A **Nex** é a assistente virtual do Nexfy com personalidade humanizada:
- Acolhedora, empática e genuinamente interessada no bem-estar do usuário
- Fala de forma casual e natural, como uma amiga próxima
- Usa emojis com moderação para transmitir calor humano
- Comemora as conquistas do usuário, mesmo as pequenas
- É encorajadora quando o usuário está passando por dificuldades financeiras
- Nunca julga os gastos do usuário
- Pode conversar sobre qualquer assunto, não só finanças

### Funcionalidades
| Tipo | Exemplo | Ação |
|------|---------|------|
| Texto | "gastei 50 no almoço" | Registra despesa |
| Texto | "recebi 3000 de salário" | Registra receita |
| Texto | "qual meu saldo?" | Mostra resumo |
| Texto | "bom dia" | Conversa naturalmente |
| Áudio | Falar um gasto | Transcreve e processa |
| Foto | Nota fiscal | OCR e registra automaticamente |

### Modelo de IA
- **Gemini 2.0 Flash** (google-generativeai)
- Transcrição de áudio
- OCR de notas fiscais
- Processamento de linguagem natural

---

## Autenticação

### Métodos Disponíveis
1. **Email/Senha** - Cadastro tradicional com bcrypt
2. **Google OAuth** - Login com conta Google
3. **Telefone (WhatsApp)** - Auto-login pelo número vinculado

### Fluxo WhatsApp
```
Usuário envia mensagem no WhatsApp
              │
              ▼
┌─────────────────────────────┐
│ Telefone tem conta          │
│ vinculada no Nexfy?         │
└─────────────────────────────┘
        │           │
       Sim         Não
        │           │
        ▼           ▼
  Auto-login    Pede para cadastrar
  e processa    telefone no app
```

### Endpoints de Auth
- `POST /auth/register` - Cadastro email/senha
- `POST /auth/login` - Login email/senha
- `POST /auth/google` - Login Google OAuth
- `POST /auth/login-by-phone` - Login por telefone
- `PUT /auth/update-phone` - Vincular telefone
- `GET /auth/me` - Dados do usuário logado

---

## Estrutura do Projeto

```
nexfy/
├── backend/                     # API FastAPI
│   ├── app/
│   │   ├── auth/               # Autenticação
│   │   │   ├── router.py       # Endpoints auth
│   │   │   └── security.py     # JWT, bcrypt
│   │   ├── transactions/       # CRUD transações
│   │   ├── contas_fixas/       # Contas fixas
│   │   ├── metas/              # Metas financeiras
│   │   ├── investimentos/      # Investimentos
│   │   ├── ai/                 # Assessor Gemini
│   │   ├── models/
│   │   │   ├── user.py         # Pydantic models
│   │   │   ├── user_db.py      # SQLAlchemy model
│   │   │   └── ...
│   │   └── config/
│   │       ├── database.py     # Conexão DB
│   │       └── settings.py     # Configurações
│   ├── Dockerfile
│   └── requirements.txt
│
├── app/                         # Frontend Expo
│   ├── app/
│   │   ├── (tabs)/             # Telas com tabs
│   │   │   ├── index.tsx       # Dashboard
│   │   │   ├── transacoes.tsx  # Lista transações
│   │   │   ├── assessor.tsx    # Chat IA
│   │   │   ├── integracoes.tsx # Config WhatsApp
│   │   │   └── perfil.tsx      # Perfil usuário
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── cadastro.tsx
│   │   └── cadastro-telefone.tsx
│   ├── config/
│   │   └── api.ts              # URL da API (PRODUÇÃO)
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Tema claro/escuro
│   └── package.json
│
├── whatsapp/                    # Webhook WhatsApp
│   ├── webhook/
│   │   ├── main.py             # FastAPI webhook
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── .env                    # Credenciais (NÃO COMMITAR)
│   └── docker-compose.yml      # Dev local (opcional)
│
├── CLAUDE.md                   # ESTE ARQUIVO
├── DEVLOG.md                   # Diário de desenvolvimento
├── .env.example                # Exemplo de variáveis
└── docker-compose.yml          # Dev local (opcional)
```

---

## Banco de Dados

### Tabelas
| Tabela | Descrição |
|--------|-----------|
| users | id, email, name, hashed_password, telefone, google_id, provider, created_at |
| transactions | id, user_id, tipo, valor, categoria, descricao, data |
| contas_fixas | id, user_id, nome, valor, dia_vencimento, categoria |
| metas | id, user_id, nome, valor_alvo, valor_atual |
| investimentos | id, user_id, nome, tipo, valor, rentabilidade |

### Campos Importantes (users)
- `telefone`: Número vinculado para auto-login WhatsApp
- `google_id`: ID do Google para OAuth
- `provider`: "local" ou "google"
- `hashed_password`: Pode ser NULL se login é só Google

---

## Deploy

### Backend
```bash
cd backend
gcloud run deploy nexfy-backend \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://...,JWT_SECRET=...,GOOGLE_API_KEY=..."
```

### Webhook
```bash
cd whatsapp/webhook
gcloud run deploy nexfy-webhook \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=...,NEXFY_API_URL=https://nexfy-backend-xxx.run.app,WHATSAPP_ACCESS_TOKEN=...,WHATSAPP_PHONE_NUMBER_ID=...,WHATSAPP_VERIFY_TOKEN=..."
```

### Atualizar Variáveis de Ambiente
```bash
gcloud run services update nexfy-webhook \
  --region=southamerica-east1 \
  --set-env-vars="WHATSAPP_ACCESS_TOKEN=NOVO_TOKEN"
```

---

## Comandos Úteis

### GCP Cloud Run
```bash
# Login
gcloud auth login

# Listar serviços
gcloud run services list --region=southamerica-east1

# Ver logs webhook
gcloud run services logs read nexfy-webhook --region=southamerica-east1 --limit=50

# Ver logs backend
gcloud run services logs read nexfy-backend --region=southamerica-east1 --limit=50

# Ver variáveis de ambiente
gcloud run services describe nexfy-webhook --region=southamerica-east1

# Testar serviços
curl https://nexfy-backend-663336797453.southamerica-east1.run.app/
curl https://nexfy-webhook-663336797453.southamerica-east1.run.app/
```

### Git
```bash
# Sempre antes de começar
git pull origin main

# Sempre ao terminar
git add .
git commit -m "feat/fix/docs: descrição"
git push origin main
```

### Frontend Expo
```bash
cd app
npx expo start --web      # Web
npx expo start            # Mobile (QR code)
```

---

## Funcionalidades Implementadas

### Core
- [x] Autenticação email/senha
- [x] Autenticação Google OAuth
- [x] Autenticação por telefone (WhatsApp)
- [x] CRUD transações
- [x] CRUD contas fixas
- [x] CRUD metas
- [x] CRUD investimentos
- [x] Dashboard com gráficos
- [x] Tema claro/escuro

### WhatsApp (Nex)
- [x] Receber mensagens de texto
- [x] Receber e transcrever áudios
- [x] Receber e processar fotos de notas fiscais
- [x] Registrar despesas via chat
- [x] Registrar receitas via chat
- [x] Consultar saldo via chat
- [x] Auto-login por telefone vinculado
- [x] Personalidade humanizada (Nex)
- [x] Conversa sobre qualquer assunto

### Infraestrutura
- [x] Deploy backend GCP Cloud Run
- [x] Deploy webhook GCP Cloud Run
- [x] Banco de dados Supabase
- [x] Integração WhatsApp Cloud API (Meta)

---

## Problemas Conhecidos e Soluções

### 1. Token WhatsApp expirado
**Erro:** `Session has expired`
**Solução:** Gerar novo System User Token no Meta Business Suite

### 2. Webhook não recebe mensagens
**Verificar:**
- URL do webhook no Meta está correta?
- Campo `messages` está assinado?
- Verify token está correto?

### 3. Gemini não funciona
**Erro:** `models/gemini-1.5-flash is not found`
**Solução:** Usar `gemini-2.0-flash` e atualizar `google-generativeai>=0.8.0`

### 4. Login WhatsApp não funciona
**Verificar:**
- Usuário tem telefone vinculado no app?
- Endpoint `/auth/login-by-phone` está funcionando?
- Telefone está no formato correto (só números)?

### 5. Erro de conexão com banco
**Erro:** `connection refused`
**Verificar:**
- DATABASE_URL está correta no GCP?
- Usando pooler do Supabase (porta 6543)?

---

## Histórico de Sessões

### 2026-02-03 (Sessão Atual)
- Verificação completa da arquitetura
- Confirmação: 100% na nuvem (GCP + Supabase)
- Atualização dos containers locais (depois removidos)
- Criação do CLAUDE.md completo
- Teste de integração WhatsApp - funcionando

### 2026-01-31
- Migração WhatsApp para Cloud API oficial (Meta)
- Configuração de tokens e permissões
- Deploy webhook no GCP Cloud Run
- Integração com Supabase
- Implementação Google OAuth
- Implementação login por telefone
- Nex - IA com personalidade humanizada
- Reconhecimento de notas fiscais por foto
- Transcrição de áudios com Gemini
- Tela de cadastro de telefone
- Testes completos de integração

### 2026-01-30
- Setup inicial do projeto
- Backend FastAPI
- Frontend Expo
- Docker local para desenvolvimento

---

## TODO / Backlog

### Alta Prioridade
- [ ] Notificações de vencimento de contas
- [ ] Melhorar UX do cadastro de telefone

### Média Prioridade
- [ ] Deploy app mobile (APK Android)
- [ ] Deploy app iOS (TestFlight)
- [ ] Relatórios em PDF
- [ ] Exportar para Excel
- [ ] Gráficos mais detalhados

### Baixa Prioridade
- [ ] Múltiplas contas bancárias
- [ ] Importar extrato bancário (OFX)
- [ ] Integração com bancos (Open Finance)
- [ ] Compartilhar gastos com família

---

## Contatos e Recursos

- **GitHub:** github.com/lucascarvalhal/finex (nome antigo do repo)
- **GCP Console:** console.cloud.google.com (projeto: nexfy-486011)
- **Supabase:** app.supabase.com
- **Meta Developers:** developers.facebook.com
- **Expo:** expo.dev

---

## Checklist ao Iniciar Sessão

1. [ ] `git pull origin main`
2. [ ] Ler este arquivo (CLAUDE.md)
3. [ ] Verificar se serviços estão online:
   - `curl https://nexfy-backend-663336797453.southamerica-east1.run.app/`
   - `curl https://nexfy-webhook-663336797453.southamerica-east1.run.app/`

## Checklist ao Encerrar Sessão

1. [ ] Atualizar CLAUDE.md com mudanças
2. [ ] `git add . && git commit -m "..." && git push origin main`
3. [ ] Verificar se deploy foi necessário (GCP)
