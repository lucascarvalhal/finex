import os
import json
import httpx
import google.generativeai as genai
from fastapi import FastAPI, Request, Query, HTTPException
from datetime import datetime
import base64
import tempfile

app = FastAPI(title="Nexfy WhatsApp Webhook")

# Configurações
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NEXFY_API_URL = os.getenv("NEXFY_API_URL", "http://host.docker.internal:8000")

# WhatsApp Cloud API (Meta)
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "nexfy_webhook_verify_2024")
WHATSAPP_API_URL = f"https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}"

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


async def send_whatsapp_message(phone: str, message: str):
    """Envia mensagem pelo WhatsApp Cloud API (Meta)"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{WHATSAPP_API_URL}/messages",
                headers={
                    "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": phone,
                    "type": "text",
                    "text": {"body": message}
                }
            )
            result = response.json()
            print(f"WhatsApp API response: {result}")
            return result
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}")
            return None


async def download_whatsapp_media(media_id: str) -> bytes:
    """Baixa mídia do WhatsApp Cloud API"""
    async with httpx.AsyncClient() as client:
        try:
            # Primeiro, obter a URL do media
            media_response = await client.get(
                f"https://graph.facebook.com/v21.0/{media_id}",
                headers={"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"}
            )
            media_data = media_response.json()
            media_url = media_data.get("url")

            if not media_url:
                return None

            # Baixar o arquivo
            file_response = await client.get(
                media_url,
                headers={"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"}
            )
            return file_response.content
        except Exception as e:
            print(f"Erro ao baixar mídia: {e}")
            return None


async def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcreve áudio usando Gemini"""
    try:
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
    """Obtém token do usuário"""
    return USER_TOKENS.get(phone)


async def register_user(phone: str, email: str, password: str) -> bool:
    """Registra ou autentica usuário"""
    async with httpx.AsyncClient() as client:
        try:
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
    return {"status": "Nexfy WhatsApp Webhook ativo!", "api": "WhatsApp Cloud API (Meta)"}


@app.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """Endpoint de verificação do webhook (requerido pelo Meta)"""
    print(f"Verificação webhook: mode={hub_mode}, token={hub_verify_token}")

    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        print("Webhook verificado com sucesso!")
        return int(hub_challenge)

    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook")
async def webhook(request: Request):
    """Recebe mensagens do WhatsApp Cloud API (Meta)"""
    try:
        body = await request.json()
        print(f"Webhook recebido: {json.dumps(body, indent=2)}")

        # Estrutura do webhook da Meta
        entry = body.get("entry", [])
        if not entry:
            return {"status": "no entry"}

        changes = entry[0].get("changes", [])
        if not changes:
            return {"status": "no changes"}

        value = changes[0].get("value", {})
        messages = value.get("messages", [])

        if not messages:
            # Pode ser uma notificação de status (entregue, lido, etc)
            statuses = value.get("statuses", [])
            if statuses:
                print(f"Status update: {statuses[0].get('status')}")
            return {"status": "no messages"}

        message = messages[0]
        phone = message.get("from")
        message_type = message.get("type")

        print(f"Mensagem de {phone}, tipo: {message_type}")

        # Extrair texto
        text = None

        if message_type == "text":
            text = message.get("text", {}).get("body")

        elif message_type == "audio":
            audio_id = message.get("audio", {}).get("id")
            if audio_id:
                audio_bytes = await download_whatsapp_media(audio_id)
                if audio_bytes:
                    text = await transcribe_audio(audio_bytes)
                    if text:
                        print(f"Áudio transcrito: {text}")

        if not text:
            return {"status": "no text"}

        print(f"Texto processado: {text}")

        # Verificar se usuário está autenticado
        token = await get_user_token(phone)

        # Comando de login
        if text.lower().startswith("/login"):
            parts = text.split()
            if len(parts) >= 3:
                email = parts[1]
                password = parts[2]
                if await register_user(phone, email, password):
                    await send_whatsapp_message(phone, "✅ Login realizado com sucesso! Agora você pode registrar suas transações.")
                else:
                    await send_whatsapp_message(phone, "❌ Erro no login. Verifique email e senha.")
            else:
                await send_whatsapp_message(phone, "Use: /login seu@email.com suasenha")
            return {"status": "ok"}

        # Se não está logado
        if not token:
            await send_whatsapp_message(
                phone,
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
        await send_whatsapp_message(phone, response_msg)

        return {"status": "ok"}

    except Exception as e:
        print(f"Erro no webhook: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


@app.post("/set-token/{phone}")
async def set_token(phone: str, token: str):
    """Endpoint auxiliar para setar token manualmente"""
    USER_TOKENS[phone] = token
    return {"status": "ok", "phone": phone}


@app.post("/send-test")
async def send_test(phone: str, message: str = "Olá! Este é um teste do Nexfy."):
    """Endpoint para testar envio de mensagem"""
    result = await send_whatsapp_message(phone, message)
    return {"status": "ok", "result": result}
