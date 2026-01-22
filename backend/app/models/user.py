from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class AuthProvider(str, Enum):
    local = "local"
    google = "google"

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    provider: AuthProvider = AuthProvider.local
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
