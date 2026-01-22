import os
from datetime import timedelta

# JWT Settings
SECRET_KEY = os.getenv("JWT_SECRET", "sua-chave-secreta-mude-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

# Database (para depois)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finex.db")
