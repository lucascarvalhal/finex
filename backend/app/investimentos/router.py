from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List

from app.models.investimento import InvestimentoCreate, InvestimentoUpdate, Investimento
from app.models.investimento_db import InvestimentoDB
from app.models.user import User
from app.config.database import get_db
from app.auth.router import get_current_user

router = APIRouter(prefix="/investimentos", tags=["investimentos"])

@router.post("/", response_model=Investimento)
def create_investimento(
    investimento: InvestimentoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_investimento = InvestimentoDB(
        user_id=current_user.id,
        nome=investimento.nome,
        tipo=investimento.tipo,
        valor_investido=investimento.valor_investido,
        valor_atual=investimento.valor_atual,
        quantidade=investimento.quantidade,
        ticker=investimento.ticker
    )
    db.add(db_investimento)
    db.commit()
    db.refresh(db_investimento)
    return db_investimento

@router.get("/", response_model=List[Investimento])
def list_investimentos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(InvestimentoDB).filter(InvestimentoDB.user_id == current_user.id).all()

@router.get("/resumo")
def get_resumo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    investimentos = db.query(InvestimentoDB).filter(
        InvestimentoDB.user_id == current_user.id
    ).all()
    
    total_investido = sum(i.valor_investido for i in investimentos)
    total_atual = sum(i.valor_atual for i in investimentos)
    rentabilidade = ((total_atual - total_investido) / total_investido * 100) if total_investido > 0 else 0
    
    return {
        "total_investido": total_investido,
        "total_atual": total_atual,
        "rentabilidade": rentabilidade,
        "quantidade": len(investimentos)
    }

@router.put("/{investimento_id}", response_model=Investimento)
def update_investimento(
    investimento_id: int,
    investimento_update: InvestimentoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    investimento = db.query(InvestimentoDB).filter(
        InvestimentoDB.id == investimento_id,
        InvestimentoDB.user_id == current_user.id
    ).first()
    
    if not investimento:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    
    update_data = investimento_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(investimento, key, value)
    
    db.commit()
    db.refresh(investimento)
    return investimento

@router.delete("/{investimento_id}")
def delete_investimento(
    investimento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    investimento = db.query(InvestimentoDB).filter(
        InvestimentoDB.id == investimento_id,
        InvestimentoDB.user_id == current_user.id
    ).first()
    
    if not investimento:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    
    db.delete(investimento)
    db.commit()
    return {"message": "Investimento excluído com sucesso"}
