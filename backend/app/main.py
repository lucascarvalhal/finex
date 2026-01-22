from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.transactions.router import router as transactions_router
from app.ai.router import router as ai_router
from app.config.database import engine, Base
from app.models.user_db import UserDB
from app.models.transaction_db import TransactionDB

# Cria as tabelas no banco
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Finex API",
    description="API do sistema de gestão financeira",
    version="0.1.0"
)

# Permitir requests do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(ai_router)

@app.get("/")
def root():
    return {"message": "Finex API funcionando!"}

@app.get("/health")
def health():
    return {"status": "ok"}
