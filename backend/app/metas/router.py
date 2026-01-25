from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List

from app.models.meta import MetaCreate, MetaUpdate, Meta
from app.models.meta_db import MetaDB
from app.models.user import User
from app.config.database import get_db
from app.auth.router import get_current_user

router = APIRouter(prefix="/metas", tags=["metas"])

@router.post("/", response_model=Meta)
def create_meta(
    meta: MetaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_meta = MetaDB(
        user_id=current_user.id,
        nome=meta.nome,
        valor_alvo=meta.valor_alvo,
        categoria=meta.categoria,
        cor=meta.cor,
        data_limite=meta.data_limite
    )
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta

@router.get("/", response_model=List[Meta])
def list_metas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(MetaDB).filter(MetaDB.user_id == current_user.id).all()

@router.put("/{meta_id}", response_model=Meta)
def update_meta(
    meta_id: int,
    meta_update: MetaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meta = db.query(MetaDB).filter(
        MetaDB.id == meta_id,
        MetaDB.user_id == current_user.id
    ).first()
    
    if not meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    update_data = meta_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meta, key, value)
    
    db.commit()
    db.refresh(meta)
    return meta

@router.patch("/{meta_id}/adicionar", response_model=Meta)
def adicionar_valor(
    meta_id: int,
    valor: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meta = db.query(MetaDB).filter(
        MetaDB.id == meta_id,
        MetaDB.user_id == current_user.id
    ).first()
    
    if not meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    meta.valor_atual += valor
    db.commit()
    db.refresh(meta)
    return meta

@router.delete("/{meta_id}")
def delete_meta(
    meta_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meta = db.query(MetaDB).filter(
        MetaDB.id == meta_id,
        MetaDB.user_id == current_user.id
    ).first()
    
    if not meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    db.delete(meta)
    db.commit()
    return {"message": "Meta excluída com sucesso"}
