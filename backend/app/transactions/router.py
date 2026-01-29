from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.models.transaction import TransactionCreate, TransactionUpdate, Transaction
from app.models.transaction_db import TransactionDB
from app.models.user import User
from app.config.database import get_db
from app.auth.router import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/", response_model=Transaction)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_transaction = TransactionDB(
        user_id=current_user.id,
        tipo=transaction.tipo,
        valor=transaction.valor,
        categoria=transaction.categoria,
        descricao=transaction.descricao,
        data=transaction.data
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.get("/", response_model=List[Transaction])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transactions = db.query(TransactionDB).filter(
        TransactionDB.user_id == current_user.id
    ).order_by(TransactionDB.data.desc()).all()
    return transactions

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transactions = db.query(TransactionDB).filter(
        TransactionDB.user_id == current_user.id
    ).all()
    
    receitas = sum(t.valor for t in transactions if t.tipo == "receita")
    despesas = sum(t.valor for t in transactions if t.tipo == "despesa")
    saldo = receitas - despesas
    
    return {
        "receitas": receitas,
        "despesas": despesas,
        "saldo": saldo
    }

@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(TransactionDB).filter(
        TransactionDB.id == transaction_id,
        TransactionDB.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    return transaction

@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(TransactionDB).filter(
        TransactionDB.id == transaction_id,
        TransactionDB.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    update_data = transaction_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(transaction, key, value)
    
    db.commit()
    db.refresh(transaction)
    return transaction

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(TransactionDB).filter(
        TransactionDB.id == transaction_id,
        TransactionDB.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    db.delete(transaction)
    db.commit()
    return {"message": "Transação excluída com sucesso"}

@router.post("/seed")
def seed_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Popula dados de teste para o usuário"""
    from datetime import datetime, timedelta
    import random
    
    categorias_despesa = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação']
    descricoes_despesa = {
        'Alimentação': ['Supermercado', 'Restaurante', 'iFood', 'Padaria', 'Açougue'],
        'Transporte': ['Uber', 'Gasolina', 'Estacionamento', 'Manutenção carro', '99'],
        'Moradia': ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Internet'],
        'Lazer': ['Netflix', 'Cinema', 'Spotify', 'Bar', 'Viagem'],
        'Saúde': ['Farmácia', 'Consulta médica', 'Academia', 'Plano de saúde'],
        'Educação': ['Curso online', 'Livros', 'Udemy', 'Mensalidade'],
    }
    
    descricoes_receita = ['Salário', 'Freelance', 'Investimentos', 'Venda', 'Cashback', 'Bônus']
    
    hoje = date.today()
    transacoes_criadas = []
    
    for i in range(90):
        data_trans = hoje - timedelta(days=i)
        
        num_despesas = random.randint(0, 3)
        for _ in range(num_despesas):
            categoria = random.choice(categorias_despesa)
            descricao = random.choice(descricoes_despesa[categoria])
            valor = round(random.uniform(15, 500), 2)
            
            t = TransactionDB(
                user_id=current_user.id,
                tipo='despesa',
                valor=valor,
                categoria=categoria,
                descricao=descricao,
                data=data_trans
            )
            db.add(t)
            transacoes_criadas.append(t)
        
        if i % 7 == 0:
            descricao = random.choice(descricoes_receita)
            valor = round(random.uniform(500, 5000), 2)
            
            t = TransactionDB(
                user_id=current_user.id,
                tipo='receita',
                valor=valor,
                categoria='Geral',
                descricao=descricao,
                data=data_trans
            )
            db.add(t)
            transacoes_criadas.append(t)
    
    db.commit()
    return {"message": f"{len(transacoes_criadas)} transações criadas com sucesso!"}

@router.post("/seed-multi")
def seed_multi_currency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Popula dados de teste com múltiplas moedas (BRL, USD, EUR)"""
    from app.transactions.seed import seed_transactions
    
    # Limpa transações antigas do usuário
    db.query(TransactionDB).filter(TransactionDB.user_id == current_user.id).delete()
    db.commit()
    
    # Cria novas transações
    count = seed_transactions(db, current_user.id)
    
    return {"message": f"{count} transações criadas com sucesso! (BRL, USD, EUR)"}
