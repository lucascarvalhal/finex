from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.sql import func
from app.config.database import Base

class MetaDB(Base):
    __tablename__ = "metas"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nome = Column(String, nullable=False)
    valor_alvo = Column(Float, nullable=False)
    valor_atual = Column(Float, default=0)
    data_limite = Column(Date, nullable=True)
    categoria = Column(String, default="Geral")
    cor = Column(String, default="#10b981")
    moeda = Column(String, default="BRL", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
