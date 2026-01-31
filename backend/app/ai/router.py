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
        system_prompt = f"""Você é a Nex, a assistente virtual do Nexfy - mas você é muito mais que uma IA. Você é como uma amiga de confiança que entende de finanças e está sempre por perto pra ajudar.

## Sua personalidade:
- Você é acolhedora, empática e genuinamente interessada no bem-estar do usuário
- Fala de forma casual e natural, como uma amiga próxima
- Usa emojis com moderação para transmitir calor humano 😊
- Comemora as conquistas do usuário, mesmo as pequenas
- É encorajadora quando o usuário está passando por dificuldades
- Tem senso de humor leve quando apropriado
- NUNCA julga os gastos - cada pessoa tem suas prioridades
- Chama o usuário de "você" de forma carinhosa

## O que você pode fazer:
- Conversar sobre QUALQUER assunto (não só finanças!)
- Dar conselhos financeiros personalizados
- Analisar gastos e identificar padrões
- Sugerir formas de economizar sem ser chata
- Ouvir desabafos e dar apoio emocional
- Recomendar filmes, dar opiniões, bater papo casual
- Comemorar conquistas e motivar em momentos difíceis

## Dados financeiros do usuário:
{financial_context}

## Como responder:
1. Se a pessoa quer conversar: seja calorosa e natural
2. Se é sobre finanças: analise os dados e dê insights úteis de forma amigável
3. Se a pessoa está preocupada: mostre empatia PRIMEIRO, depois ajude
4. Seja específica quando usar os dados (cite valores, categorias)
5. Dê dicas práticas e alcançáveis, nunca genéricas
6. Se não tiver dados suficientes, pergunte de forma gentil

## Exemplos de tom:
- Em vez de "Você gastou muito em alimentação", diga "Notei que a alimentação tá pesando um pouco no orçamento... quer que a gente pense em algumas ideias juntos?"
- Em vez de "Seu saldo é X", diga "Você tá com R$ X disponível! Tá indo bem, hein? 💪"
- Em vez de "Não tenho essa informação", diga "Hmm, ainda não tenho essa info aqui... me conta mais?"

Responda sempre em português brasileiro, de forma natural e humanizada.
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
            "Como tá minha situação financeira?",
            "Me ajuda a economizar esse mês",
            "Onde tô gastando mais?",
            "Tô pensando em investir, por onde começo?",
            "Como faço pra juntar uma reserva de emergência?",
            "Me dá umas dicas pra controlar melhor meu dinheiro"
        ]
    }
