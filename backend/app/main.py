import warnings
warnings.filterwarnings("ignore", message="Your application has authenticated using end user credentials")
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.transactions.router import router as transactions_router
from app.ai.router import router as ai_router
from app.contas_fixas.router import router as contas_fixas_router
from app.metas.router import router as metas_router
from app.investimentos.router import router as investimentos_router
from app.config.database import engine, Base

# Importar todos os models para criar as tabelas
from app.models.user_db import UserDB
from app.models.transaction_db import TransactionDB
from app.models.conta_fixa_db import ContaFixaDB
from app.models.meta_db import MetaDB
from app.models.investimento_db import InvestimentoDB

# Cria as tabelas no banco
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nexfy API",
    description="API do sistema de gestão financeira",
    version="0.2.0"
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
app.include_router(contas_fixas_router)
app.include_router(metas_router)
app.include_router(investimentos_router)

@app.get("/")
def root():
    return {"message": "Nexfy API funcionando!"}

@app.get("/health")
def health():
    return {"status": "ok"}
