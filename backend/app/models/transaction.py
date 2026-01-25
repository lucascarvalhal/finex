from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum

class TipoTransacao(str, Enum):
    receita = "receita"
    despesa = "despesa"

class TransactionBase(BaseModel):
    tipo: TipoTransacao
    valor: float
    categoria: str
    descricao: Optional[str] = None
    data: date
    moeda: Optional[str] = "BRL"

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    tipo: Optional[TipoTransacao] = None
    valor: Optional[float] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    data: Optional[date] = None
    moeda: Optional[str] = None

class Transaction(TransactionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
