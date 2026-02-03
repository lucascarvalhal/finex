# CLAUDE.md - Nexfy Project Context

> Este arquivo mantém o contexto do projeto para o Claude Code. Atualize sempre que houver mudanças significativas.

**Última atualização:** 2026-02-03

---

## Visão Geral

**Nexfy** é um aplicativo de gestão financeira pessoal com assistente IA via WhatsApp.

---

## Arquitetura de Produção

```
┌──────────────────────────────────────────────────────────────────┐
│                    WhatsApp Cloud API (Meta)                     │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  GCP Cloud Run - Webhook                                │    │
│   │  nexfy-webhook-663336797453.southamerica-east1.run.app  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  GCP Cloud Run - Backend                                │    │
│   │  nexfy-backend-663336797453.southamerica-east1.run.app  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Supabase PostgreSQL                                    │    │
│   │  aws-1-sa-east-1.pooler.supabase.com:6543               │    │
│   └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## URLs e Endpoints

### Produção (GCP Cloud Run)
- **Backend:** https://nexfy-backend-663336797453.southamerica-east1.run.app
- **Webhook:** https://nexfy-webhook-663336797453.southamerica-east1.run.app
- **Webhook URL (Meta):** https://nexfy-webhook-663336797453.southamerica-east1.run.app/webhook

### Banco de Dados (Supabase)
- **Host:** aws-1-sa-east-1.pooler.supabase.com
- **Porta:** 6543
- **Database:** postgres
- **Project Ref:** uulxkquorddagobccemd

### GCP
- **Projeto:** nexfy-486011
- **Região:** southamerica-east1
- **Conta:** lucas.carvalhal.pereira@gmail.com

---

## Estrutura do Projeto

```
nexfy/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── auth/           # Autenticação (JWT, Google OAuth, telefone)
│   │   ├── transactions/   # CRUD transações
│   │   ├── contas_fixas/   # CRUD contas fixas
│   │   ├── metas/          # CRUD metas
│   │   ├── investimentos/  # CRUD investimentos
│   │   ├── ai/             # Assessor Gemini
│   │   ├── models/         # Models SQLAlchemy + Pydantic
│   │   └── config/         # Database config
│   ├── Dockerfile
│   └── requirements.txt
├── app/                     # Frontend Expo (React Native)
│   ├── app/
│   │   ├── (tabs)/         # Telas principais
│   │   │   ├── index.tsx   # Dashboard
│   │   │   ├── transacoes.tsx
│   │   │   ├── assessor.tsx
│   │   │   ├── integracoes.tsx
│   │   │   └── perfil.tsx
│   │   ├── login.tsx
│   │   ├── cadastro.tsx
│   │   └── cadastro-telefone.tsx
│   ├── config/
│   │   └── api.ts          # URL da API (produção)
│   └── contexts/
│       └── ThemeContext.tsx
├── whatsapp/                # Webhook WhatsApp
│   ├── webhook/
│   │   ├── main.py         # FastAPI webhook
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── .env                # Credenciais WhatsApp (local)
├── CLAUDE.md               # Este arquivo
├── DEVLOG.md               # Diário de desenvolvimento
└── .env.example
```

---

## Funcionalidades Implementadas

### Autenticação
- [x] Login email/senha
- [x] Login Google OAuth
- [x] Login automático por telefone (WhatsApp)
- [x] Cadastro com verificação de telefone
- [x] JWT tokens

### WhatsApp (Nex - IA Assistente)
- [x] Mensagens de texto
- [x] Áudios (transcrição com Gemini)
- [x] Fotos de notas fiscais (OCR com Gemini)
- [x] Registrar despesas/receitas
- [x] Consultar saldo
- [x] Auto-login por telefone vinculado
- [x] Personalidade humanizada (Nex)

### Dashboard
- [x] Resumo financeiro
- [x] Gráficos (receitas/despesas)
- [x] Filtros por período
- [x] Tema claro/escuro

### Transações
- [x] CRUD completo
- [x] Categorização automática
- [x] Filtros e busca

---

## Configurações Importantes

### WhatsApp Cloud API (Meta)
- **Phone Number ID:** 998730039984529
- **Business Account ID:** 1415027933346400
- **Verify Token:** nexfy_webhook_verify_2024
- **Access Token:** Armazenado no GCP Cloud Run (variável de ambiente)

### Gemini
- **Modelo:** gemini-2.0-flash
- **API Key:** Armazenada no GCP Cloud Run

---

## Deploy

### Backend (GCP Cloud Run)
```bash
cd backend
gcloud run deploy nexfy-backend \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated
```

### Webhook (GCP Cloud Run)
```bash
cd whatsapp/webhook
gcloud run deploy nexfy-webhook \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated
```

### Variáveis de Ambiente no GCP
```bash
# Atualizar variáveis
gcloud run services update nexfy-webhook \
  --region=southamerica-east1 \
  --set-env-vars="GEMINI_API_KEY=xxx,NEXFY_API_URL=xxx,..."
```

---

## Desenvolvimento Local (Opcional)

### Iniciar Backend Local
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Iniciar Frontend
```bash
cd app
npx expo start --web
```

### Docker Local (se necessário)
```bash
# Backend + DB local
docker-compose up -d

# Webhook local
cd whatsapp
docker-compose up -d
```

---

## Comandos Úteis GCP

```bash
# Login
gcloud auth login

# Listar serviços
gcloud run services list --region=southamerica-east1

# Ver logs do webhook
gcloud run services logs read nexfy-webhook --region=southamerica-east1 --limit=50

# Ver logs do backend
gcloud run services logs read nexfy-backend --region=southamerica-east1 --limit=50

# Descrever serviço (ver variáveis)
gcloud run services describe nexfy-webhook --region=southamerica-east1
```

---

## Banco de Dados

### Supabase Connection String
```
postgresql://postgres.uulxkquorddagobccemd:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

### Tabelas Principais
- `users` - Usuários (email, name, hashed_password, telefone, google_id, provider)
- `transactions` - Transações financeiras
- `contas_fixas` - Contas fixas mensais
- `metas` - Metas financeiras
- `investimentos` - Investimentos

---

## Usuários de Teste

| Email | Senha | Telefone |
|-------|-------|----------|
| lucas@nexfy.com | 123456 | (vincular no app) |

---

## Notas Importantes

1. **Tokens WhatsApp expiram** - Se der erro de token, gerar novo no Meta Developer Console
2. **Frontend aponta para produção** - O arquivo `app/config/api.ts` tem a URL do GCP
3. **Não usar Docker local em produção** - Tudo roda no GCP Cloud Run + Supabase
4. **Nex é a assistente IA** - Personalidade humanizada, empática e acolhedora

---

## Histórico de Sessões

### 2026-02-03
- Verificação completa da arquitetura
- Confirmação: tudo 100% na nuvem (GCP + Supabase)
- Criação do CLAUDE.md para sincronização entre máquinas

### 2026-01-31
- Migração WhatsApp para Cloud API oficial (Meta)
- Deploy webhook no GCP Cloud Run
- Integração Supabase
- Implementação Google OAuth
- Nex - IA com personalidade humanizada
- Reconhecimento de notas fiscais por foto
- Transcrição de áudios

---

## TODO / Backlog

- [ ] Deploy app mobile (APK/iOS)
- [ ] Notificações push
- [ ] Relatórios em PDF
- [ ] Exportar para Excel
- [ ] Múltiplas contas bancárias
- [ ] Importar extrato bancário
