import os
import json
import httpx
import google.generativeai as genai
from fastapi import FastAPI, Request
from datetime import datetime
import base64
import tempfile

app = FastAPI(title="Nexfy WhatsApp Webhook")

# Configurações
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NEXFY_API_URL = os.getenv("NEXFY_API_URL", "http://host.docker.internal:8000")
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "http://evolution-api:8080")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "nexfy_secret_key_123")

# Configurar Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Token do usuário (simplificado - em produção usar banco de dados)
USER_TOKENS = {}

SYSTEM_PROMPT = """
Você é um assistente financeiro do app Nexfy. Analise a mensagem do usuário e extraia as informações financeiras.

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
    "tipo": "despesa" | "receita" | "conta_fixa" | "consulta" | "saldo" | "nao_entendi",
    "valor": número ou null,
    "categoria": "Alimentação" | "Transporte" | "Moradia" | "Lazer" | "Saúde" | "Educação" | "Salário" | "Freelance" | "Geral",
    "descricao": "descrição curta",
    "resposta": "mensagem amigável para o usuário"
}

Categorias para DESPESAS: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Geral
Categorias para RECEITAS: Salário, Freelance, Investimentos, Geral

Exemplos:
- "gastei 30 no almoço" → tipo: despesa, valor: 30, categoria: Alimentação, descricao: almoço
- "recebi 5000 de salário" → tipo: receita, valor: 5000, categoria: Salário, descricao: salário
- "paguei 150 de luz" → tipo: conta_fixa, valor: 150, categoria: Moradia, descricao: conta de luz
- "quanto gastei esse mês?" → tipo: consulta
- "qual meu saldo?" → tipo: saldo
- "bom dia" → tipo: nao_entendi, resposta: "Olá! Sou seu assistente financeiro..."

Sempre retorne JSON válido, sem markdown ou texto adicional.
"""

async def send_whatsapp_message(instance: str, phone: str, message: str):
    """Envia mensagem de volta pelo WhatsApp"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{EVOLUTION_API_URL}/message/sendText/{instance}",
                headers={"apikey": EVOLUTION_API_KEY},
                json={
                    "number": phone,
                    "text": message
                }
            )
            return response.json()
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}")
            return None

async def transcribe_audio(audio_base64: str) -> str:
    """Transcreve áudio usando Gemini (suporta áudio diretamente)"""
    try:
        # Gemini 1.5 suporta áudio diretamente
        audio_bytes = base64.b64decode(audio_base64)
        
        # Salvar temporariamente
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        # Upload para Gemini
        audio_file = genai.upload_file(temp_path, mime_type="audio/ogg")
        
        response = model.generate_content([
            "Transcreva este áudio em português. Retorne apenas o texto transcrito, sem explicações.",
            audio_file
        ])
        
        # Limpar arquivo temporário
        os.unlink(temp_path)
        
        return response.text.strip()
    except Exception as e:
        print(f"Erro na transcrição: {e}")
        return None

async def process_with_gemini(text: str) -> dict:
    """Processa texto com Gemini para extrair intenção"""
    try:
        response = model.generate_content(f"{SYSTEM_PROMPT}\n\nMensagem do usuário: {text}")
        result = response.text.strip()
        
        # Limpar possíveis marcadores de código
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        result = result.strip()
        
        return json.loads(result)
    except Exception as e:
        print(f"Erro no Gemini: {e}")
        return {"tipo": "nao_entendi", "resposta": "Desculpe, não consegui entender. Tente novamente!"}

async def get_user_token(phone: str) -> str:
    """Obtém token do usuário - simplificado para teste"""
    # Em produção, isso seria um banco de dados
    # Por agora, vamos usar um token fixo para teste
    return USER_TOKENS.get(phone)

async def register_user(phone: str, email: str, password: str) -> bool:
    """Registra ou autentica usuário"""
    async with httpx.AsyncClient() as client:
        try:
            # Tentar login
            response = await client.post(
                f"{NEXFY_API_URL}/auth/login",
                data={"username": email, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                USER_TOKENS[phone] = data["access_token"]
                return True
        except Exception as e:
            print(f"Erro no login: {e}")
    return False

async def create_transaction(token: str, tipo: str, valor: float, categoria: str, descricao: str) -> bool:
    """Cria transação no Nexfy"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{NEXFY_API_URL}/transactions/",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "tipo": tipo,
                    "valor": valor,
                    "categoria": categoria,
                    "descricao": descricao,
                    "data": datetime.now().strftime("%Y-%m-%d")
                }
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Erro ao criar transação: {e}")
            return False

async def get_summary(token: str) -> dict:
    """Obtém resumo financeiro"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{NEXFY_API_URL}/transactions/summary",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Erro ao obter resumo: {e}")
    return None

@app.get("/")
async def root():
    return {"status": "Nexfy WhatsApp Webhook ativo!"}

@app.post("/webhook")
async def webhook(request: Request):
    """Recebe mensagens do WhatsApp via Evolution API"""
    try:
        body = await request.json()
        print(f"Webhook recebido: {json.dumps(body, indent=2)}")
        
        # Verificar se é uma mensagem
        if body.get("event") != "messages.upsert":
            return {"status": "ignored"}
        
        data = body.get("data", {})
        
        # Ignorar mensagens enviadas por nós
        if data.get("key", {}).get("fromMe"):
            return {"status": "ignored"}
        
        instance = body.get("instance")
        phone = data.get("key", {}).get("remoteJid", "").replace("@s.whatsapp.net", "")
        message_data = data.get("message", {})
        
        # Extrair texto ou áudio
        text = None
        
        # Mensagem de texto
        if "conversation" in message_data:
            text = message_data["conversation"]
        elif "extendedTextMessage" in message_data:
            text = message_data["extendedTextMessage"].get("text")
        
        # Mensagem de áudio
        elif "audioMessage" in message_data:
            audio_data = message_data.get("audioMessage", {})
            # Baixar e transcrever áudio
            media_url = data.get("media", {}).get("url")
            if media_url:
                async with httpx.AsyncClient() as client:
                    audio_response = await client.get(media_url)
                    if audio_response.status_code == 200:
                        audio_base64 = base64.b64encode(audio_response.content).decode()
                        text = await transcribe_audio(audio_base64)
                        if text:
                            print(f"Áudio transcrito: {text}")
        
        if not text:
            return {"status": "no text"}
        
        print(f"Mensagem de {phone}: {text}")
        
        # Verificar se usuário está autenticado
        token = await get_user_token(phone)
        
        # Comando de login
        if text.lower().startswith("/login"):
            parts = text.split()
            if len(parts) >= 3:
                email = parts[1]
                password = parts[2]
                if await register_user(phone, email, password):
                    await send_whatsapp_message(instance, phone, "✅ Login realizado com sucesso! Agora você pode registrar suas transações.")
                else:
                    await send_whatsapp_message(instance, phone, "❌ Erro no login. Verifique email e senha.")
            else:
                await send_whatsapp_message(instance, phone, "Use: /login seu@email.com suasenha")
            return {"status": "ok"}
        
        # Se não está logado
        if not token:
            await send_whatsapp_message(
                instance, phone,
                "👋 Olá! Sou o assistente do Nexfy.\n\nPara começar, faça login:\n/login seu@email.com suasenha"
            )
            return {"status": "ok"}
        
        # Processar mensagem com Gemini
        result = await process_with_gemini(text)
        print(f"Resultado Gemini: {result}")
        
        tipo = result.get("tipo")
        valor = result.get("valor")
        categoria = result.get("categoria", "Geral")
        descricao = result.get("descricao", "")
        
        # Executar ação baseada no tipo
        if tipo == "despesa" and valor:
            success = await create_transaction(token, "despesa", valor, categoria, descricao)
            if success:
                response_msg = f"✅ Despesa registrada!\n\n💸 R$ {valor:.2f}\n📁 {categoria}\n📝 {descricao}"
            else:
                response_msg = "❌ Erro ao registrar despesa. Tente novamente."
        
        elif tipo == "receita" and valor:
            success = await create_transaction(token, "receita", valor, categoria, descricao)
            if success:
                response_msg = f"✅ Receita registrada!\n\n💰 R$ {valor:.2f}\n📁 {categoria}\n📝 {descricao}"
            else:
                response_msg = "❌ Erro ao registrar receita. Tente novamente."
        
        elif tipo == "saldo" or tipo == "consulta":
            summary = await get_summary(token)
            if summary:
                response_msg = f"📊 *Resumo Financeiro*\n\n💰 Receitas: R$ {summary['receitas']:.2f}\n💸 Despesas: R$ {summary['despesas']:.2f}\n\n💵 *Saldo: R$ {summary['saldo']:.2f}*"
            else:
                response_msg = "❌ Erro ao obter resumo. Tente novamente."
        
        else:
            response_msg = result.get("resposta", "🤔 Não entendi. Tente algo como:\n\n• gastei 30 no almoço\n• recebi 5000 de salário\n• qual meu saldo?")
        
        # Enviar resposta
        await send_whatsapp_message(instance, phone, response_msg)
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Erro no webhook: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/set-token/{phone}")
async def set_token(phone: str, token: str):
    """Endpoint auxiliar para setar token manualmente"""
    USER_TOKENS[phone] = token
    return {"status": "ok", "phone": phone}
