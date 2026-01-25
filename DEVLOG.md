# 📊 Finex - Diário de Desenvolvimento

## Visão Geral do Projeto
**Finex** é um aplicativo de gestão financeira pessoal com:
- Dashboard web/mobile (React Native + Expo)
- Backend API (FastAPI + PostgreSQL)
- Assistente IA financeiro (Gemini)
- Integração WhatsApp (Evolution API)

---

## 🗓️ Histórico de Desenvolvimento

### 25/01/2026 - Integração WhatsApp + Novo Layout

**O que foi feito:**
- ✅ Criado novo layout tema claro inspirado no Finanças Pro
- ✅ Implementado backend para Contas Fixas (CRUD completo)
- ✅ Implementado backend para Metas Financeiras
- ✅ Implementado backend para Investimentos
- ✅ Dashboard com gráfico donut "Restante para Gastar"
- ✅ Navegação por meses (Jan-Dez)
- ✅ Cards: Entradas, Contas Fixas, Gastos Variáveis, Metas, Investimentos
- ✅ Integração WhatsApp com Evolution API + Gemini
- ✅ Webhook para processar texto e áudio
- ✅ Docker Compose configurado

**Arquivos criados/modificados:**
- `backend/app/models/conta_fixa_db.py`
- `backend/app/models/conta_fixa.py`
- `backend/app/models/meta_db.py`
- `backend/app/models/meta.py`
- `backend/app/models/investimento_db.py`
- `backend/app/models/investimento.py`
- `backend/app/contas_fixas/router.py`
- `backend/app/metas/router.py`
- `backend/app/investimentos/router.py`
- `backend/app/main.py` (atualizado)
- `app/app/(tabs)/index.tsx` (novo layout)
- `whatsapp/docker-compose.yml`
- `whatsapp/webhook/main.py`

**Pendências:**
- [ ] Testar integração WhatsApp (aguardando chip secundário)
- [ ] Melhorias no frontend
- [ ] Editar/excluir contas fixas, metas e investimentos no frontend

---

### 23/01/2026 - Correções e Filtros

**O que foi feito:**
- ✅ Corrigido botão de excluir transação na web (Alert.alert → window.confirm)
- ✅ Adicionado filtro interativo Dia/Mês/Ano/Tudo no dashboard
- ✅ Gráficos com dados reais (não mais hardcoded)
- ✅ Botão "Explore Dashboard" abre modal de planos
- ✅ Endpoint `/transactions/seed` para popular dados de teste

**Commits:**
- `fix: corrige delete na web, adiciona filtros e modal de planos`

---

### Antes de 23/01/2026 - Setup Inicial

**O que foi feito:**
- ✅ Setup inicial do projeto
- ✅ Backend FastAPI com autenticação JWT
- ✅ CRUD de transações
- ✅ Frontend Expo (React Native)
- ✅ Telas: Login, Cadastro, Dashboard, Transações, Perfil
- ✅ Assessor IA com Gemini
- ✅ Integração com PostgreSQL

---

## 🏗️ Arquitetura Atual
```
finex/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── auth/           # Autenticação JWT
│   │   ├── transactions/   # CRUD transações
│   │   ├── contas_fixas/   # CRUD contas fixas
│   │   ├── metas/          # CRUD metas
│   │   ├── investimentos/  # CRUD investimentos
│   │   ├── ai/             # Assessor Gemini
│   │   ├── models/         # Models SQLAlchemy + Pydantic
│   │   └── config/         # Database config
│   └── venv/
├── app/                     # Frontend Expo
│   ├── app/
│   │   ├── (tabs)/         # Telas principais
│   │   │   ├── index.tsx   # Dashboard
│   │   │   ├── transacoes.tsx
│   │   │   ├── assessor.tsx
│   │   │   └── perfil.tsx
│   │   ├── login.tsx
│   │   └── cadastro.tsx
│   └── package.json
├── whatsapp/                # Integração WhatsApp
│   ├── docker-compose.yml
│   └── webhook/
│       ├── main.py         # Webhook FastAPI
│       ├── Dockerfile
│       └── requirements.txt
└── README.md
```

---

## 🚀 Como Rodar

### Backend
```bash
cd ~/pessoal/finex/backend
source venv/bin/activate
sudo service postgresql start
uvicorn app.main:app --reload
```

### Frontend
```bash
cd ~/pessoal/finex/app
npx expo start --web
```

### WhatsApp (Docker)
```bash
cd ~/pessoal/finex/whatsapp
docker-compose up -d
```

---

## 📋 Backlog / Próximas Features

### Alta Prioridade
- [ ] Testar e finalizar integração WhatsApp
- [ ] Editar/excluir Contas Fixas no frontend
- [ ] Editar/excluir Metas no frontend
- [ ] Editar/excluir Investimentos no frontend
- [ ] Adicionar valor às metas pelo frontend

### Média Prioridade
- [ ] Relatórios em PDF
- [ ] Exportar para Excel
- [ ] Notificações de vencimento de contas
- [ ] Gráficos mais detalhados
- [ ] Filtros avançados nas transações

### Baixa Prioridade
- [ ] Deploy (Railway/Vercel)
- [ ] App mobile (APK Android)
- [ ] Múltiplas contas bancárias
- [ ] Importar extrato bancário
- [ ] Dark mode toggle

---

## 🐛 Bugs Conhecidos

| Bug | Status | Descrição |
|-----|--------|-----------|
| - | - | Nenhum bug conhecido no momento |

---

## 📝 Notas

### Credenciais de Teste
- **Email:** (seu email de teste)
- **Senha:** (sua senha de teste)

### API Keys
- **Gemini:** Configurada em `whatsapp/.env`

### Portas
- Backend Finex: `http://localhost:8000`
- Frontend Expo: `http://localhost:8081`
- Evolution API: `http://localhost:8085`
- Webhook: `http://localhost:5001`

---

## 📅 Template para Atualização Diária
```markdown
### DD/MM/AAAA - Título do Dia

**O que foi feito:**
- ✅ Item 1
- ✅ Item 2

**Problemas encontrados:**
- Descrição do problema e como resolveu

**Pendências:**
- [ ] Item pendente

**Próximos passos:**
- Item para amanhã
```
