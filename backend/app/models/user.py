from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('A senha deve ter pelo menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('A senha deve conter pelo menos uma letra minúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('A senha deve conter pelo menos um número')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('A senha deve conter pelo menos um caractere especial (!@#$%^&*)')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('O nome deve ter pelo menos 2 caracteres')
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: int
    email: str
    name: str
    provider: str
    telefone: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PhoneUpdate(BaseModel):
    telefone: str

class GoogleAuth(BaseModel):
    access_token: str
    email: EmailStr
    name: str
    google_id: str

class PhoneLogin(BaseModel):
    telefone: str
