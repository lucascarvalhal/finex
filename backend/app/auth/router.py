from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import UserCreate, UserLogin, Token, User, AuthProvider
from app.auth.security import get_password_hash, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

# Banco temporário em memória (depois vai pro PostgreSQL)
fake_users_db: dict[str, dict] = {}
user_id_counter = 0

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado"
        )
    
    email = payload.get("sub")
    if email is None or email not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado"
        )
    
    db_user = fake_users_db[email]
    return User(
        id=db_user["id"],
        email=db_user["email"],
        name=db_user["name"],
        provider=db_user["provider"]
    )

@router.post("/register", response_model=User)
def register(user: UserCreate):
    global user_id_counter
    
    if user.email in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    user_id_counter += 1
    hashed_password = get_password_hash(user.password)
    
    db_user = {
        "id": user_id_counter,
        "email": user.email,
        "name": user.name,
        "hashed_password": hashed_password,
        "provider": AuthProvider.local
    }
    fake_users_db[user.email] = db_user
    
    return User(
        id=db_user["id"],
        email=db_user["email"],
        name=db_user["name"],
        provider=db_user["provider"]
    )

@router.post("/login", response_model=Token)
def login(user: UserLogin):
    db_user = fake_users_db.get(user.email)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    if not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    
    return Token(access_token=access_token)

@router.get("/me", response_model=User)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
