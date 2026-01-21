from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Finex API",
    description="API do sistema de gestão financeira",
    version="0.1.0"
)

# Permitir requests do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Finex API funcionando!"}

@app.get("/health")
def health():
    return {"status": "ok"}
