from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class MetaBase(BaseModel):
    nome: str
    valor_alvo: float
    categoria: Optional[str] = "Geral"
    cor: Optional[str] = "#10b981"
    data_limite: Optional[date] = None
    moeda: Optional[str] = "BRL"

class MetaCreate(MetaBase):
    pass

class MetaUpdate(BaseModel):
    nome: Optional[str] = None
    valor_alvo: Optional[float] = None
    valor_atual: Optional[float] = None
    categoria: Optional[str] = None
    cor: Optional[str] = None
    data_limite: Optional[date] = None
    moeda: Optional[str] = None

class Meta(MetaBase):
    id: int
    user_id: int
    valor_atual: float
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
