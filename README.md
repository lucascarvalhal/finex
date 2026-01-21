# Finex

Sistema de gestão financeira pessoal e empresarial com IA.

## Stack

- **Frontend:** Expo (React Native) - Web + Mobile
- **Backend:** FastAPI (Python)

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd app
npm install
npx expo start --web
```

## Estrutura
```
finex/
├── app/          # Frontend Expo
├── backend/      # API FastAPI
└── README.md
```
