from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.config.database import Base

class ContaFixaDB(Base):
    __tablename__ = "contas_fixas"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nome = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    dia_vencimento = Column(Integer, nullable=False)  # Dia do mês (1-31)
    categoria = Column(String, default="Geral")
    pago = Column(Boolean, default=False)
    mes_referencia = Column(Integer, nullable=False)  # 1-12
    ano_referencia = Column(Integer, nullable=False)
    parcela_atual = Column(Integer, default=1)
    parcela_total = Column(Integer, default=1)
    moeda = Column(String, default="BRL", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
