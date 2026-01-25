from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List

from app.models.conta_fixa import ContaFixaCreate, ContaFixaUpdate, ContaFixa
from app.models.conta_fixa_db import ContaFixaDB
from app.models.user import User
from app.config.database import get_db
from app.auth.router import get_current_user

router = APIRouter(prefix="/contas-fixas", tags=["contas-fixas"])

@router.post("/", response_model=ContaFixa)
def create_conta_fixa(
    conta: ContaFixaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_conta = ContaFixaDB(
        user_id=current_user.id,
        nome=conta.nome,
        valor=conta.valor,
        dia_vencimento=conta.dia_vencimento,
        categoria=conta.categoria,
        mes_referencia=conta.mes_referencia,
        ano_referencia=conta.ano_referencia,
        parcela_atual=conta.parcela_atual,
        parcela_total=conta.parcela_total
    )
    db.add(db_conta)
    db.commit()
    db.refresh(db_conta)
    return db_conta

@router.get("/", response_model=List[ContaFixa])
def list_contas_fixas(
    mes: int = None,
    ano: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ContaFixaDB).filter(ContaFixaDB.user_id == current_user.id)
    if mes:
        query = query.filter(ContaFixaDB.mes_referencia == mes)
    if ano:
        query = query.filter(ContaFixaDB.ano_referencia == ano)
    return query.order_by(ContaFixaDB.dia_vencimento).all()

@router.put("/{conta_id}", response_model=ContaFixa)
def update_conta_fixa(
    conta_id: int,
    conta_update: ContaFixaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conta = db.query(ContaFixaDB).filter(
        ContaFixaDB.id == conta_id,
        ContaFixaDB.user_id == current_user.id
    ).first()
    
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    update_data = conta_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(conta, key, value)
    
    db.commit()
    db.refresh(conta)
    return conta

@router.patch("/{conta_id}/toggle-pago", response_model=ContaFixa)
def toggle_pago(
    conta_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conta = db.query(ContaFixaDB).filter(
        ContaFixaDB.id == conta_id,
        ContaFixaDB.user_id == current_user.id
    ).first()
    
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    conta.pago = not conta.pago
    db.commit()
    db.refresh(conta)
    return conta

@router.delete("/{conta_id}")
def delete_conta_fixa(
    conta_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conta = db.query(ContaFixaDB).filter(
        ContaFixaDB.id == conta_id,
        ContaFixaDB.user_id == current_user.id
    ).first()
    
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    db.delete(conta)
    db.commit()
    return {"message": "Conta excluída com sucesso"}
