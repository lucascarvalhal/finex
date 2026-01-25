from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InvestimentoBase(BaseModel):
    nome: str
    tipo: str
    valor_investido: float
    valor_atual: float
    quantidade: Optional[float] = 1
    ticker: Optional[str] = None
    moeda: Optional[str] = "BRL"

class InvestimentoCreate(InvestimentoBase):
    pass

class InvestimentoUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    valor_investido: Optional[float] = None
    valor_atual: Optional[float] = None
    quantidade: Optional[float] = None
    ticker: Optional[str] = None
    moeda: Optional[str] = None

class Investimento(InvestimentoBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
