from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ContaFixaBase(BaseModel):
    nome: str
    valor: float
    dia_vencimento: int
    categoria: Optional[str] = "Geral"
    parcela_atual: Optional[int] = 1
    parcela_total: Optional[int] = 1
    moeda: Optional[str] = "BRL"

class ContaFixaCreate(ContaFixaBase):
    mes_referencia: int
    ano_referencia: int

class ContaFixaUpdate(BaseModel):
    nome: Optional[str] = None
    valor: Optional[float] = None
    dia_vencimento: Optional[int] = None
    categoria: Optional[str] = None
    pago: Optional[bool] = None
    parcela_atual: Optional[int] = None
    parcela_total: Optional[int] = None
    moeda: Optional[str] = None

class ContaFixa(ContaFixaBase):
    id: int
    user_id: int
    pago: bool
    mes_referencia: int
    ano_referencia: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
