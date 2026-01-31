from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.models.user import UserCreate, UserLogin, Token, User, PhoneUpdate, GoogleAuth, PhoneLogin
from app.models.user_db import UserDB
from app.auth.security import get_password_hash, verify_password, create_access_token, decode_token
from app.config.database import get_db
from pydantic import ValidationError

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserDB:
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado"
        )
    email = payload.get("sub")
    db_user = db.query(UserDB).filter(UserDB.email == email).first()
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado"
        )
    return db_user

@router.post("/register", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserDB).filter(UserDB.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    hashed_password = get_password_hash(user.password)
    db_user = UserDB(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        provider="local"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.email == user.email).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token)

@router.get("/me", response_model=User)
def get_me(current_user: UserDB = Depends(get_current_user)):
    return current_user

@router.put("/update-phone", response_model=User)
def update_phone(
    phone_data: PhoneUpdate,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    current_user.telefone = phone_data.telefone
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/login-by-phone", response_model=Token)
def login_by_phone(phone_data: PhoneLogin, db: Session = Depends(get_db)):
    """Login automático pelo número de telefone (para WhatsApp)"""
    # Normalizar telefone (remover formatação)
    telefone = phone_data.telefone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    # Buscar usuário pelo telefone
    db_user = db.query(UserDB).filter(UserDB.telefone == telefone).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telefone não vinculado a nenhuma conta"
        )

    access_token = create_access_token(data={"sub": db_user.email})
    return Token(access_token=access_token)


@router.post("/google", response_model=Token)
def google_auth(auth_data: GoogleAuth, db: Session = Depends(get_db)):
    """Login ou registro via Google OAuth"""
    # Verificar se usuário já existe pelo google_id ou email
    db_user = db.query(UserDB).filter(
        (UserDB.google_id == auth_data.google_id) | (UserDB.email == auth_data.email)
    ).first()

    if db_user:
        # Usuário existe - atualizar google_id se necessário
        if not db_user.google_id:
            db_user.google_id = auth_data.google_id
            db_user.provider = "google"
            db.commit()
    else:
        # Criar novo usuário
        db_user = UserDB(
            email=auth_data.email,
            name=auth_data.name,
            google_id=auth_data.google_id,
            provider="google",
            hashed_password=None
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    access_token = create_access_token(data={"sub": db_user.email})
    return Token(access_token=access_token)
