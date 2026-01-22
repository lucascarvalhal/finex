from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import google.generativeai as genai
import os
from dotenv import load_dotenv

from app.config.database import get_db
from app.models.user import User
from app.models.transaction_db import TransactionDB
from app.auth.router import get_current_user

load_dotenv()

# Configurar Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

def get_user_financial_context(db: Session, user_id: int) -> str:
    """Busca o contexto financeiro do usuário para a IA"""
    transactions = db.query(TransactionDB).filter(
        TransactionDB.user_id == user_id
    ).order_by(TransactionDB.data.desc()).limit(50).all()
    
    if not transactions:
        return "O usuário ainda não possui transações registradas."
    
    receitas = sum(t.valor for t in transactions if t.tipo == "receita")
    despesas = sum(t.valor for t in transactions if t.tipo == "despesa")
    saldo = receitas - despesas
    
    # Agrupar por categoria
    categorias_despesas = {}
    for t in transactions:
        if t.tipo == "despesa":
            if t.categoria not in categorias_despesas:
                categorias_despesas[t.categoria] = 0
            categorias_despesas[t.categoria] += t.valor
    
    context = f"""
Resumo financeiro do usuário:
- Total de receitas: R$ {receitas:.2f}
- Total de despesas: R$ {despesas:.2f}
- Saldo atual: R$ {saldo:.2f}

Despesas por categoria:
"""
    for cat, valor in sorted(categorias_despesas.items(), key=lambda x: x[1], reverse=True):
        context += f"- {cat}: R$ {valor:.2f}\n"
    
    context += f"\nÚltimas transações:\n"
    for t in transactions[:10]:
        tipo = "+" if t.tipo == "receita" else "-"
        context += f"- {t.data}: {tipo}R$ {t.valor:.2f} ({t.categoria}) - {t.descricao or 'Sem descrição'}\n"
    
    return context

@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Buscar contexto financeiro
        financial_context = get_user_financial_context(db, current_user.id)
        
        # Prompt do sistema
        system_prompt = f"""Você é o assistente financeiro do Finex, um aplicativo de gestão de finanças pessoais.
Seu nome é Finex AI. Seja amigável, prestativo e dê conselhos práticos sobre finanças.

Você tem acesso aos dados financeiros do usuário:
{financial_context}

Regras:
1. Sempre responda em português brasileiro
2. Seja conciso e direto
3. Dê dicas práticas e personalizadas baseadas nos dados do usuário
4. Se não souber algo, admita
5. Nunca invente dados financeiros que não estão no contexto
6. Incentive hábitos financeiros saudáveis
7. Use emojis ocasionalmente para ser mais amigável
"""
        
        # Gerar resposta
        chat = model.start_chat(history=[])
        response = chat.send_message(f"{system_prompt}\n\nUsuário: {message.message}")
        
        return ChatResponse(response=response.text)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar mensagem: {str(e)}")

@router.get("/suggestions")
async def get_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna sugestões de perguntas baseadas no perfil do usuário"""
    return {
        "suggestions": [
            "Como posso economizar mais?",
            "Analise meus gastos do mês",
            "Quais categorias estou gastando mais?",
            "Me dê dicas de investimento para iniciantes",
            "Como criar uma reserva de emergência?"
        ]
    }
