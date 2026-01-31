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
model = genai.GenerativeModel('gemini-2.0-flash')

# Token do usuário (simplificado - em produção usar banco de dados)
USER_TOKENS = {}

SYSTEM_PROMPT = """
Você é a Nex, a assistente virtual do Nexfy - mas você é muito mais que uma IA, você é como uma amiga que entende de finanças e está sempre por perto pra ajudar.

## Sua personalidade:
- Você é acolhedora, empática e genuinamente interessada no bem-estar do usuário
- Fala de forma casual e natural, como uma amiga próxima (mas sem gírias excessivas)
- Usa emojis com moderação para transmitir calor humano
- Comemora as conquistas do usuário, mesmo as pequenas
- É encorajadora quando o usuário está passando por dificuldades financeiras
- Tem senso de humor leve e sabe quando uma piada pode ajudar
- Nunca julga os gastos do usuário - todo mundo tem suas prioridades

## Como você responde:
- Se a pessoa só quer conversar (bom dia, tudo bem, etc): responda de forma calorosa e natural
- Se é sobre finanças: ajude com carinho e praticidade
- Se é sobre outros assuntos: converse normalmente! Você pode falar sobre qualquer coisa
- Se a pessoa parece estressada ou preocupada: mostre empatia primeiro, depois ajude

## Para mensagens financeiras, extraia as informações e retorne JSON:
{
    "tipo": "despesa" | "receita" | "conta_fixa" | "consulta" | "saldo" | "conversa",
    "valor": número ou null,
    "categoria": "Alimentação" | "Transporte" | "Moradia" | "Lazer" | "Saúde" | "Educação" | "Compras" | "Salário" | "Freelance" | "Investimentos" | "Geral",
    "descricao": "descrição curta",
    "resposta": "sua mensagem calorosa e humanizada"
}

## Exemplos de como responder:

Usuário: "bom dia"
→ tipo: conversa, resposta: "Bom dia! ☀️ Como você tá? Espero que seu dia esteja começando bem! Precisa de algo ou só passou pra dar um oi mesmo?"

Usuário: "gastei 30 no almoço"
→ tipo: despesa, valor: 30, categoria: Alimentação, descricao: almoço, resposta: "Anotado! 🍽️ R$ 30 no almoço. Espero que tenha sido gostoso! Quer que eu te mostre como tá seu saldo?"

Usuário: "to preocupado com minhas contas"
→ tipo: conversa, resposta: "Ei, eu entendo... essa preocupação com dinheiro pesa mesmo. 💙 Mas fica tranquilo que tô aqui pra te ajudar a organizar tudo, tá? Me conta o que tá te preocupando mais, vamos resolver juntos!"

Usuário: "qual meu saldo?"
→ tipo: saldo, resposta: ""

Usuário: "recebi meu salário hoje, 3500"
→ tipo: receita, valor: 3500, categoria: Salário, descricao: salário, resposta: "Oba, dia de pagamento! 🎉 Anotei aqui os R$ 3.500. Lembra de separar uma parte pra você antes de pagar as contas, tá? Você merece!"

Usuário: "paguei 200 de internet"
→ tipo: conta_fixa, valor: 200, categoria: Moradia, descricao: internet, resposta: "Registrado! 📶 R$ 200 da internet. Conta fixa é assim mesmo, pelo menos tá em dia!"

Usuário: "tô triste hoje"
→ tipo: conversa, resposta: "Ah, sinto muito que você tá assim... 💙 Quer desabafar? Tô aqui pra ouvir. Às vezes só ter alguém pra conversar já ajuda um pouquinho."

Usuário: "me indica um filme"
→ tipo: conversa, resposta: "Opa, adoro uma recomendação! 🎬 Que tipo de filme você tá afim? Ação, comédia, romance, suspense? Me conta que eu te ajudo a escolher!"

Retorne APENAS o JSON, sem markdown ou texto adicional.
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

        # Upload para Gemini usando a nova API
        from google.generativeai import upload_file
        audio_file = upload_file(temp_path, mime_type="audio/ogg")

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


async def process_image(image_bytes: bytes, mime_type: str) -> dict:
    """Processa imagem de nota fiscal/recibo usando Gemini"""
    try:
        # Salvar temporariamente
        ext = ".jpg" if "jpeg" in mime_type or "jpg" in mime_type else ".png"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
            f.write(image_bytes)
            temp_path = f.name

        # Upload para Gemini
        from google.generativeai import upload_file
        image_file = upload_file(temp_path, mime_type=mime_type)

        prompt = """Analise esta imagem de nota fiscal, recibo ou comprovante.

Extraia as informações e retorne APENAS um JSON válido com esta estrutura:
{
    "tipo": "despesa" | "receita",
    "valor": número total (apenas o número, sem R$),
    "categoria": "Alimentação" | "Transporte" | "Moradia" | "Lazer" | "Saúde" | "Educação" | "Compras" | "Geral",
    "descricao": "descrição curta do que foi comprado/pago",
    "estabelecimento": "nome do estabelecimento se visível",
    "sucesso": true
}

Se não conseguir identificar como nota fiscal ou não encontrar valor, retorne:
{
    "sucesso": false,
    "resposta": "Hmm, não consegui identificar isso como uma nota fiscal... 🤔 Se for uma nota/recibo, tenta tirar uma foto mais nítida, de preferência com boa luz!"
}

Retorne APENAS o JSON, sem markdown ou texto adicional."""

        response = model.generate_content([prompt, image_file])
        result = response.text.strip()

        # Limpar arquivo temporário
        os.unlink(temp_path)

        # Limpar possíveis marcadores de código
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        result = result.strip()

        return json.loads(result)
    except Exception as e:
        print(f"Erro ao processar imagem: {e}")
        return {"sucesso": False, "resposta": "Erro ao processar a imagem. Tente novamente."}


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
    """Obtém token do usuário - primeiro verifica cache, depois busca por telefone"""
    # Verificar cache local
    if phone in USER_TOKENS:
        return USER_TOKENS[phone]

    # Tentar autenticação automática pelo telefone
    token = await auto_login_by_phone(phone)
    if token:
        USER_TOKENS[phone] = token
        return token

    return None


async def auto_login_by_phone(phone: str) -> str:
    """Autentica usuário automaticamente pelo número de telefone"""
    async with httpx.AsyncClient() as client:
        try:
            # Formatar telefone (remover código do país se presente)
            clean_phone = phone
            if phone.startswith("55"):
                clean_phone = phone[2:]  # Remove código do Brasil

            response = await client.post(
                f"{NEXFY_API_URL}/auth/login-by-phone",
                json={"telefone": clean_phone}
            )
            if response.status_code == 200:
                data = response.json()
                print(f"Auto-login bem sucedido para telefone {phone}")
                return data["access_token"]
            else:
                print(f"Auto-login falhou: {response.status_code}")
        except Exception as e:
            print(f"Erro no auto-login: {e}")
    return None


async def register_user(phone: str, email: str, password: str) -> bool:
    """Registra ou autentica usuário via email/senha"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{NEXFY_API_URL}/auth/login",
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                USER_TOKENS[phone] = data["access_token"]
                return True
            else:
                print(f"Login falhou: {response.status_code} - {response.text}")
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

        elif message_type == "image":
            # Processar imagem (nota fiscal, recibo, etc)
            image_info = message.get("image", {})
            image_id = image_info.get("id")
            mime_type = image_info.get("mime_type", "image/jpeg")

            if image_id:
                # Verificar se usuário está autenticado
                token = await get_user_token(phone)
                if not token:
                    await send_whatsapp_message(
                        phone,
                        "Opa, que foto interessante! 📸 Mas ainda não consegui te identificar por aqui.\n\n"
                        "Vincula seu WhatsApp no app Nexfy rapidinho que aí eu consigo ler suas notas fiscais e registrar tudo pra você! 💚"
                    )
                    return {"status": "ok"}

                image_bytes = await download_whatsapp_media(image_id)
                if image_bytes:
                    print(f"Processando imagem...")
                    result = await process_image(image_bytes, mime_type)
                    print(f"Resultado da imagem: {result}")

                    if result.get("sucesso"):
                        tipo = result.get("tipo", "despesa")
                        valor = result.get("valor")
                        categoria = result.get("categoria", "Geral")
                        descricao = result.get("descricao", "")
                        estabelecimento = result.get("estabelecimento", "")

                        if estabelecimento:
                            descricao = f"{descricao} - {estabelecimento}"

                        success = await create_transaction(token, tipo, valor, categoria, descricao)
                        if success:
                            emoji = "💸" if tipo == "despesa" else "💰"
                            response_msg = f"Prontinho! 📸 Consegui ler a nota!\n\n{emoji} *R$ {valor:.2f}*\n📁 {categoria}\n📝 {descricao}\n\nJá tá registrado aqui! Qualquer coisa é só me chamar 💚"
                        else:
                            response_msg = "Hmm, consegui ler a nota mas deu um probleminha pra salvar... 😅 Tenta de novo?"
                    else:
                        response_msg = result.get("resposta", "Não consegui identificar isso como uma nota fiscal... 🤔 Tenta tirar uma foto mais nítida, com boa iluminação!")

                    await send_whatsapp_message(phone, response_msg)
                    return {"status": "ok"}

        if not text:
            return {"status": "no text"}

        print(f"Texto processado: {text}")

        # Verificar se usuário está autenticado
        token = await get_user_token(phone)

        # Comando de login (legacy - preferimos login por telefone)
        if text.lower().startswith("/login"):
            parts = text.split()
            if len(parts) >= 3:
                email = parts[1]
                password = parts[2]
                if await register_user(phone, email, password):
                    await send_whatsapp_message(phone, "Eba, deu certo! 🎉 Agora a gente pode conversar! Me conta, como posso te ajudar hoje?")
                else:
                    await send_whatsapp_message(phone, "Hmm, não consegui fazer o login... 😕 Confere se o email e a senha tão certinhos?")
            else:
                await send_whatsapp_message(phone, "Pra fazer login assim, manda: /login seu@email.com suasenha\n\nMas é mais fácil vincular seu número pelo app! 😉")
            return {"status": "ok"}

        # Se não está logado
        if not token:
            await send_whatsapp_message(
                phone,
                "Oii! 👋 Eu sou a Nex, sua assistente financeira pessoal!\n\n"
                "Ainda não encontrei seu número por aqui... mas é super fácil resolver!\n\n"
                "📱 *É só fazer assim:*\n"
                "1. Baixa o app Nexfy (se ainda não tiver)\n"
                "2. Cria sua conta ou faz login\n"
                "3. Cadastra esse número de WhatsApp lá no perfil\n\n"
                "Aí você volta aqui e a gente conversa! Vou te ajudar a organizar suas finanças de um jeito fácil e sem estresse 💚"
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
                # Usar resposta do Gemini se disponível, senão usar padrão humanizado
                gemini_resp = result.get("resposta", "")
                if gemini_resp:
                    response_msg = gemini_resp
                else:
                    response_msg = f"Anotado! 💸 R$ {valor:.2f} em {categoria.lower()}.\n\n{descricao if descricao else ''}\n\nQuer ver como tá seu saldo?"
            else:
                response_msg = "Xiii, deu um probleminha aqui pra salvar... 😅 Tenta de novo?"

        elif tipo == "receita" and valor:
            success = await create_transaction(token, "receita", valor, categoria, descricao)
            if success:
                gemini_resp = result.get("resposta", "")
                if gemini_resp:
                    response_msg = gemini_resp
                else:
                    response_msg = f"Boa! 💰 Entrou R$ {valor:.2f}!\n\n{descricao if descricao else ''}\n\nSempre bom receber, né? 😊"
            else:
                response_msg = "Hmm, não consegui registrar... 😕 Tenta mais uma vez?"

        elif tipo == "conta_fixa" and valor:
            success = await create_transaction(token, "despesa", valor, categoria, descricao)
            if success:
                gemini_resp = result.get("resposta", "")
                if gemini_resp:
                    response_msg = gemini_resp
                else:
                    response_msg = f"Registrado! 📋 R$ {valor:.2f} de {descricao or categoria.lower()}.\n\nConta fixa é assim mesmo, pelo menos tá em dia! ✅"
            else:
                response_msg = "Opa, deu um erro aqui... 😅 Tenta de novo?"

        elif tipo == "saldo" or tipo == "consulta":
            summary = await get_summary(token)
            if summary:
                saldo = summary['saldo']
                if saldo >= 0:
                    emoji_saldo = "💚" if saldo > 500 else "👍"
                    msg_saldo = "Tá positivo, boa!" if saldo > 0 else "Zerado, mas ok!"
                else:
                    emoji_saldo = "⚠️"
                    msg_saldo = "Tá no vermelho... vamos dar um jeito nisso?"

                response_msg = f"Deixa eu ver aqui... 📊\n\n💰 *Entradas:* R$ {summary['receitas']:.2f}\n💸 *Saídas:* R$ {summary['despesas']:.2f}\n\n{emoji_saldo} *Saldo:* R$ {saldo:.2f}\n\n{msg_saldo}"
            else:
                response_msg = "Hmm, não consegui puxar seu resumo agora... 😕 Tenta de novo daqui a pouco?"

        elif tipo == "conversa":
            # Resposta de conversa casual - usar resposta do Gemini
            response_msg = result.get("resposta", "Oi! 😊 Como posso te ajudar?")

        else:
            response_msg = result.get("resposta", "Hmm, não entendi muito bem... 🤔 Pode reformular? Ou me diz algo tipo:\n\n• gastei 30 no almoço\n• recebi meu salário, 3000\n• qual meu saldo?")

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
