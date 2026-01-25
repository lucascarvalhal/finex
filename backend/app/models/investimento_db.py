from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.config.database import Base

class InvestimentoDB(Base):
    __tablename__ = "investimentos"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nome = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # Ações, FII, Renda Fixa, Crypto, etc
    valor_investido = Column(Float, nullable=False)
    valor_atual = Column(Float, nullable=False)
    quantidade = Column(Float, default=1)
    ticker = Column(String, nullable=True)  # PETR4, VALE3, etc
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
