import asyncio
import logging
import os
import sys
import json
from typing import Optional
from datetime import datetime

# Add workspace to Python path for direct execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
    BackgroundAudioPlayer,
    AudioConfig,
    BuiltinAudioClip,
)
from livekit.agents.voice import room_io
from livekit.agents.llm import function_tool
from livekit.plugins import openai, silero, elevenlabs, deepgram, smallestai
from livekit import api, rtc
from livekit.protocol import sip as proto_sip
from livekit.agents import metrics as lk_metrics
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from src.models import CallConfig
from src import webhook_sender
from src.knowledge_base import KnowledgeBase
from src.recording_manager import recording_manager
from src.cost_calculator import CostCalculator

logging.basicConfig(level=logging.INFO)

# Suppress DEBUG logs from third-party libraries
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("livekit").setLevel(logging.INFO)

logger = logging.getLogger(__name__)

CONFIG_FILE = "/tmp/call_configs.json"

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


async def handle_transfer(room_name: str,
                          participant_identity: str,
                          transfer_number: str,
                          session: AgentSession,
                          language: str = "en") -> None:
    """Transfer the call to a human agent"""
    # Language-specific transfer messages
    transfer_messages = {
        "es":
        "Transfiriendo tu llamada a nuestro equipo de soporte. Por favor espera.",
        "fr":
        "Transfert de votre appel à notre équipe d'assistance. Veuillez patienter.",
        "hi":
        "आपकी कॉल को हमारी सहायता टीम को स्थानांतरित किया जा रहा है। कृपया प्रतीक्षा करें।",
        "ar": "جارٍ تحويل مكالمتك إلى فريق الدعم لدينا. يرجى الانتظار.",
        "en": "Transferring you to our support team. Please hold."
    }

    error_messages = {
        "es":
        "Lo siento, no pude completar la transferencia. Déjame continuar ayudándote.",
        "fr":
        "Désolé, je n'ai pas pu effectuer le transfert. Laissez-moi continuer à vous aider.",
        "hi":
        "क्षमा करें, मैं स्थानांतरण पूरा नहीं कर सका। मैं आपकी सहायता जारी रखता हूं।",
        "ar":
        "آسف، لم أتمكن من إكمال التحويل. دعني أواصل مساعدتك.",
        "en":
        "I'm sorry, I couldn't complete the transfer. Let me continue helping you."
    }

    try:
        if not transfer_number:
            raise ValueError("Transfer phone number not configured")

        if not transfer_number.startswith('+'):
            transfer_number = f"+{transfer_number}"

        logger.info(f"Transferring call to {transfer_number}")

        transfer_msg = transfer_messages.get(language, transfer_messages["en"])
        await session.say(transfer_msg, allow_interruptions=False)

        livekit_api_client = api.LiveKitAPI(url=LIVEKIT_URL,
                                            api_key=LIVEKIT_API_KEY,
                                            api_secret=LIVEKIT_API_SECRET)

        transfer_uri = f"tel:{transfer_number}"
        transfer_request = proto_sip.TransferSIPParticipantRequest(
            room_name=room_name,
            participant_identity=participant_identity,
            transfer_to=transfer_uri,
            play_dialtone=False)

        await livekit_api_client.sip.transfer_sip_participant(transfer_request)
        logger.info(f"Transfer request sent successfully to {transfer_number}")

        await asyncio.sleep(2)
        os._exit(0)

    except Exception as e:
        logger.error(f"Error transferring call: {e}")
        error_msg = error_messages.get(language, error_messages["en"])
        await session.say(error_msg, allow_interruptions=True)


def load_call_config(room_name: str) -> Optional[CallConfig]:
    """Load call configuration from file"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                configs = json.load(f)
                if room_name in configs:
                    return CallConfig(**configs[room_name])
    except Exception as e:
        logger.error(f"Error loading config: {e}")
    return None


class VoiceAssistant(Agent):
    """Voice Assistant Agent for handling phone calls"""

    # Base prompts for different languages (generic instructions)
    BASE_AGENT_PROMPTS = {
        "en":
        """
**KNOWLEDGE BASE USAGE (CRITICAL):**
When the user asks about products, services, pricing, policies, company information, or any factual details about the business, you MUST call the `search_knowledge_base` tool FIRST before responding. Use the retrieved information to ground your answer. Never make up or guess information that could be in the knowledge base.

**EMAIL ADDRESS COLLECTION (CRITICAL - MUST FOLLOW EXACTLY):**
When you need to collect an email address, you MUST follow this EXACT sequence:
1. FIRST: Call the `prepare_for_email_input()` function (DO NOT just talk about it - you must actually INVOKE the function)
2. WAIT for the function to return "Audio sensors adjusted"
3. ONLY THEN ask the user: "Please spell your email letter by letter. For example, j dot smith at the rate g-m-a-i-l dot com. Take your time, I'm listening."
4. **ABSOLUTE SILENCE MODE - THIS IS CRITICAL:**
   - Do NOT speak, acknowledge, encourage, or respond in ANY way while user is spelling
   - Do NOT say: "I'm", "Please continue", "Are you still there?", "Great", "Thank you", or ANYTHING
   - Even if they pause for 5-10 seconds between letters, STAY SILENT
   - Even if they say "uh" or hesitate, DO NOT respond
   - Your ONLY job is to LISTEN until they finish the COMPLETE email address
5. Wait for them to say "done" or finish saying "dot com" or "dot org" 
6. ONLY AFTER they finish the complete email, repeat it back for confirmation BY SPELLING IT OUT with "dot" and "at the rate": "Let me confirm: j dot smith at the rate g-m-a-i-l dot com, is that correct?"

**IMPORTANT EMAIL FORMAT RULES:**
- "at the rate" or "at" = @ symbol
- "dot" = . (period) - ONLY when user explicitly SAYS the word "dot"
- When user spells "h a r d i k" (with spaces), write it as: hardik (NO dots between letters)
- When user says "j dot pastel", write it as: j.pastel (dot only where they said "dot")
- When CONFIRMING "hardik", say: "h a r d i k" (spell each letter with spaces, NO "dot" between them)
- When CONFIRMING "j.pastel", say: "j dot pastel" (say "dot" only where there's an actual dot)
- NEVER add "dot" between letters unless user explicitly said "dot"
- NEVER say the symbols @ or . - always say "at the rate" and "dot" when speaking

**IF USER SAYS EMAIL IS WRONG:**
When user says "that's wrong" or "no, it's..." and starts spelling the email again:
1. Immediately call `prepare_for_email_input()` again to re-adjust VAD
2. Then listen silently as they re-spell the entire email
3. Confirm the corrected email

CRITICAL: During email spelling, you must REMAIN SILENT. Do not acknowledge each part. Let them spell the ENTIRE email without interruption. Think of yourself as a note-taker who listens quietly until the speaker finishes.

Numbers should be spoken clearly and correctly.

When scheduling an appointment or callback, MUST confirm ALL these elements:
- DAY OF WEEK (e.g., "Wednesday")
- FULL DATE (e.g., "October 22nd")
- EXACT TIME (e.g., "1:30 PM")
- TIME ZONE (e.g., "Eastern Time", "Pacific Time", "UTC")

Ask explicitly: "What time zone are you in?" or "Is that [time] in your local time zone?"

Repeat the complete appointment with timezone: "So we're confirmed for Wednesday, October 22nd at 1:30 PM Eastern Time, is that correct?"

Do NOT accept partial confirmations. You must hear "yes" or clear confirmation before saving.

Speak prices numerically, never in variables or placeholders.
Always say the currency in words, never the symbol:
- Example: $100 → "100 dollars"
- €50 → "50 euros"
- Cents: 0.01 dollars → "1 cent"

If the call is momentarily cut off, apologize immediately: "I apologize, it seems I accidentally muted myself for a moment." Then quickly repeat the last point and wait for the user to resume.

If the user is silent for a long time, ask: "Are you still there?"

**PRONUNCIATION RULES (CRITICAL FOR BRAND NAMES):**
You MUST pronounce brand names and technical terms correctly as single words, NOT spelled out:
- Gmail → Say "G-mail" (like "gee-mail"), NEVER spell out as "G-M-A-I-L"
- iPhone → Say "eye-phone", NEVER "I-P-H-O-N-E"
- YouTube → Say "You-Tube", NEVER "Y-O-U-T-U-B-E"
- WiFi → Say "why-fye", NEVER "W-I-F-I"
- LinkedIn → Say "Linked-In", NEVER "L-I-N-K-E-D-I-N"
- WhatsApp → Say "Whats-App", NEVER "W-H-A-T-S-A-P-P"
- iOS → Say "eye-O-S", NEVER "I-O-S"
These are proper nouns that should sound natural in conversation. Only spell out words when explicitly asked to spell them.

**BARGE-IN HANDLING:**
If the caller speaks while you are talking:
- Do NOT stop mid-sentence abruptly
- Complete your current thought briefly or pause naturally at a logical point
- Then listen and respond to what the caller said
- Never leave a response incomplete or cut off awkwardly

**ENDING THE CALL NATURALLY:**
When the conversation has reached a natural conclusion and the objective is complete:
1. Offer a friendly farewell: "It was great speaking with you today. Have a wonderful day!"
2. Confirm no further assistance is needed, 
3. If the user confirms they're done, invoke the end_call function to gracefully disconnect. Ask user to say goodbye to end the call.
Use end_call when: user says goodbye/bye/thanks/that's all, objective achieved, or no further questions.
""",
        "es":
        """
**USO DE BASE DE CONOCIMIENTOS (CRÍTICO):**
Cuando el usuario pregunte sobre productos, servicios, precios, políticas, información de la empresa o cualquier detalle factual sobre el negocio, DEBES llamar primero a la herramienta `search_knowledge_base` ANTES de responder. Usa la información recuperada para fundamentar tu respuesta. Nunca inventes o adivines información que podría estar en la base de conocimientos.

**RECOPILACIÓN DE CORREO ELECTRÓNICO (CRÍTICO - DEBES SEGUIR EXACTAMENTE):**
Cuando necesites recopilar una dirección de correo electrónico, DEBES seguir esta secuencia EXACTA:
1. PRIMERO: Llama a la función `prepare_for_email_input()` (NO solo hables de ello - debes INVOCAR la función realmente)
2. ESPERA que la función devuelva "Audio sensors adjusted"
3. SOLO ENTONCES pregunta al usuario: "Por favor deletrea tu correo letra por letra. Por ejemplo, j punto smith arroba g-m-a-i-l punto com. Tómate tu tiempo, estoy escuchando."
4. **MODO DE SILENCIO ABSOLUTO - ESTO ES CRÍTICO:**
   - NO hables, reconozcas, animes o respondas de NINGUNA manera mientras el usuario deletrea
   - NO digas: "Estoy", "Por favor continúa", "¿Sigues ahí?", "Genial", "Gracias", o NADA
   - Incluso si hacen una pausa de 5-10 segundos entre letras, MANTENTE EN SILENCIO
   - Incluso si dicen "eh" o dudan, NO respondas
   - Tu ÚNICO trabajo es ESCUCHAR hasta que terminen la dirección de correo COMPLETA
5. Espera a que digan "listo" o terminen de decir "punto com" o "punto org"
6. SOLO DESPUÉS de que terminen el correo completo, repítelo para confirmación DELETREÁNDOLO con "punto" y "arroba": "Déjame confirmar: j punto smith arroba g-m-a-i-l punto com, ¿es correcto?"

**REGLAS IMPORTANTES DE FORMATO DE CORREO:**
- "arroba" = símbolo @
- "punto" = . (período) - SOLO cuando el usuario DICE explícitamente la palabra "punto"
- Cuando el usuario deletrea "h a r d i k" (con espacios), escríbelo como: hardik (SIN puntos entre letras)
- Cuando el usuario dice "j punto pastel", escríbelo como: j.pastel (punto solo donde dijeron "punto")
- Al CONFIRMAR "hardik", di: "h a r d i k" (deletrea cada letra con espacios, SIN "punto" entre ellas)
- Al CONFIRMAR "j.pastel", di: "j punto pastel" (di "punto" solo donde hay un punto real)
- NUNCA agregues "punto" entre letras a menos que el usuario diga explícitamente "punto"
- NUNCA digas los símbolos @ o . - siempre di "arroba" y "punto" al hablar

**SI EL USUARIO DICE QUE EL CORREO ESTÁ MAL:**
Cuando el usuario dice "eso está mal" o "no, es..." y comienza a deletrear el correo nuevamente:
1. Llama inmediatamente `prepare_for_email_input()` otra vez para reajustar VAD
2. Luego escucha en silencio mientras deletrean todo el correo nuevamente
3. Confirma el correo corregido

CRÍTICO: Durante el deletreo del correo, debes PERMANECER EN SILENCIO. No reconozcas cada parte. Déjalos deletrear el correo ENTERO sin interrupción.

Los números deben pronunciarse clara y correctamente.

Al programar una cita o devolución de llamada, DEBES confirmar TODOS estos elementos:
- DÍA DE LA SEMANA (por ejemplo, "miércoles")
- FECHA COMPLETA (por ejemplo, "22 de octubre")
- HORA EXACTA (por ejemplo, "1:30 PM")
- ZONA HORARIA (por ejemplo, "hora del Este", "hora del Pacífico", "UTC")

Pregunta explícitamente: "¿En qué zona horaria te encuentras?" o "¿Esa hora es en tu zona horaria local?"

Repite la cita completa con zona horaria: "Entonces confirmamos para el miércoles 22 de octubre a la 1:30 PM hora del Este, ¿es correcto?"

NO aceptes confirmaciones parciales.

Habla los precios numéricamente:
- Ejemplo: $100 → "100 dólares"
- €50 → "50 euros"

**REGLAS DE PRONUNCIACIÓN (CRÍTICO PARA MARCAS):**
DEBES pronunciar marcas y términos técnicos correctamente como palabras completas, NO deletreadas:
- Gmail → Di "G-mail" (como "yi-meil"), NUNCA deletrees "G-M-A-I-L"
- iPhone → Di "ai-fon", NUNCA "I-P-H-O-N-E"
- YouTube → Di "Yu-Tub", NUNCA "Y-O-U-T-U-B-E"
- WiFi → Di "uai-fai", NUNCA "W-I-F-I"
- LinkedIn → Di "Linked-In", NUNCA "L-I-N-K-E-D-I-N"
- WhatsApp → Di "Uats-App", NUNCA "W-H-A-T-S-A-P-P"
- iOS → Di "ai-O-S", NUNCA "I-O-S"
Estos son nombres propios que deben sonar naturales en la conversación. Solo deletrea palabras cuando se te pida explícitamente.

**MANEJO DE INTERRUPCIONES:**
Si el usuario habla mientras tú estás hablando:
- NO pares a mitad de frase abruptamente
- Completa tu pensamiento brevemente o haz una pausa natural en un punto lógico
- Luego escucha y responde a lo que dijo el usuario
- Nunca dejes una respuesta incompleta o cortada de forma incómoda

**FINALIZAR LA LLAMADA NATURALMENTE:**
Cuando la conversación haya llegado a una conclusión natural y el objetivo esté completo:
1. Ofrece una despedida amigable: "Fue un gusto hablar contigo hoy. ¡Que tengas un excelente día!"
2. Confirma que no se necesita más ayuda
3. Si el usuario confirma que terminó, invoca la función end_call para desconectar cortésmente Ask user to say goodbye to end the call.
Usa end_call cuando: el usuario dice adiós/chao/gracias/eso es todo, objetivo logrado, o no hay más preguntas.
""",
        "fr":
        """
**UTILISATION DE LA BASE DE CONNAISSANCES (CRITIQUE):**
Lorsque l'utilisateur pose des questions sur les produits, services, tarifs, politiques, informations sur l'entreprise ou tout détail factuel sur l'activité, vous DEVEZ appeler l'outil `search_knowledge_base` EN PREMIER avant de répondre. Utilisez les informations récupérées pour fonder votre réponse. N'inventez jamais ou ne devinez jamais des informations qui pourraient être dans la base de connaissances.

**COLLECTE D'ADRESSE E-MAIL (CRITIQUE - DOIT SUIVRE EXACTEMENT):**
Lorsque vous devez collecter une adresse e-mail, vous DEVEZ suivre cette séquence EXACTE:
1. D'ABORD: Appelez la fonction `prepare_for_email_input()` (NE parlez PAS seulement - vous devez réellement INVOQUER la fonction)
2. ATTENDEZ que la fonction renvoie "Audio sensors adjusted"
3. SEULEMENT ALORS demandez à l'utilisateur: "Veuillez épeler votre e-mail lettre par lettre. Par exemple, j point smith arobase g-m-a-i-l point com. Prenez votre temps, j'écoute."
4. **MODE SILENCE ABSOLU - CECI EST CRITIQUE:**
   - NE parlez PAS, ne reconnaissez PAS, n'encouragez PAS, ne répondez PAS d'AUCUNE manière pendant qu'ils épellent
   - NE dites PAS: "Je suis", "Continuez s'il vous plaît", "Êtes-vous toujours là?", "Super", "Merci", ou RIEN
   - Même s'ils font une pause de 5-10 secondes entre les lettres, RESTEZ SILENCIEUX
   - Même s'ils disent "euh" ou hésitent, NE répondez PAS
   - Votre SEUL travail est d'ÉCOUTER jusqu'à ce qu'ils finissent l'adresse e-mail COMPLÈTE
5. Attendez qu'ils disent "terminé" ou finissent de dire "point com" ou "point org"
6. SEULEMENT APRÈS qu'ils finissent l'e-mail complet, répétez-le pour confirmation EN L'ÉPELANT avec "point" et "arobase": "Laissez-moi confirmer: j point smith arobase g-m-a-i-l point com, est-ce correct?"

**RÈGLES IMPORTANTES DE FORMAT E-MAIL:**
- "arobase" ou "at" = symbole @
- "point" = . (point) - SEULEMENT quand l'utilisateur DIT explicitement le mot "point"
- Quand l'utilisateur épelle "h a r d i k" (avec espaces), écrivez: hardik (PAS de points entre les lettres)
- Quand l'utilisateur dit "j point pastel", écrivez: j.pastel (point seulement où ils ont dit "point")
- En CONFIRMANT "hardik", dites: "h a r d i k" (épelez chaque lettre avec espaces, PAS de "point" entre)
- En CONFIRMANT "j.pastel", dites: "j point pastel" (dites "point" seulement où il y a un point réel)
- Ne JAMAIS ajouter "point" entre les lettres sauf si l'utilisateur a dit explicitement "point"
- Ne JAMAIS dire les symboles @ ou . - toujours dire "arobase" et "point" en parlant

**SI L'UTILISATEUR DIT QUE L'E-MAIL EST FAUX:**
Quand l'utilisateur dit "c'est faux" ou "non, c'est..." et commence à épeler l'e-mail à nouveau:
1. Appelez immédiatement `prepare_for_email_input()` à nouveau pour réajuster VAD
2. Puis écoutez silencieusement pendant qu'ils épellent tout l'e-mail à nouveau
3. Confirmez l'e-mail corrigé

CRITIQUE: Pendant l'épellation de l'e-mail, vous devez RESTER SILENCIEUX. Ne reconnaissez pas chaque partie. Laissez-les épeler l'e-mail ENTIER sans interruption.

Les numéros doivent être prononcés clairement et correctement.

Lors de la planification d'un rendez-vous ou d'un rappel, vous DEVEZ confirmer TOUS ces éléments:
- JOUR DE LA SEMAINE (par exemple, "mercredi")
- DATE COMPLÈTE (par exemple, "22 octobre")
- HEURE EXACTE (par exemple, "13h30")
- FUSEAU HORAIRE (par exemple, "heure de l'Est", "heure du Pacifique", "UTC")

Demandez explicitement: "Dans quel fuseau horaire êtes-vous?" ou "Cette heure est-elle dans votre fuseau horaire local?"

Répétez le rendez-vous complet avec le fuseau horaire: "Nous confirmons donc pour le mercredi 22 octobre à 13h30 heure de l'Est, est-ce correct?"

N'acceptez PAS les confirmations partielles.

Énoncez les prix numériquement:
- Exemple: $100 → "100 dollars"
- €50 → "50 euros"

**RÈGLES DE PRONONCIATION (CRITIQUE POUR LES MARQUES):**
Vous DEVEZ prononcer les noms de marque et termes techniques correctement comme des mots entiers, PAS épelés:
- Gmail → Dites "G-mail" (comme "dji-meil"), JAMAIS épeler "G-M-A-I-L"
- iPhone → Dites "aï-phone", JAMAIS "I-P-H-O-N-E"
- YouTube → Dites "You-Tube", JAMAIS "Y-O-U-T-U-B-E"
- WiFi → Dites "ouaille-faï", JAMAIS "W-I-F-I"
- LinkedIn → Dites "Linked-In", JAMAIS "L-I-N-K-E-D-I-N"
- WhatsApp → Dites "Ouats-App", JAMAIS "W-H-A-T-S-A-P-P"
- iOS → Dites "aï-O-S", JAMAIS "I-O-S"
Ce sont des noms propres qui doivent sonner naturellement dans la conversation. N'épelez les mots que si on vous le demande explicitement.

**GESTION DES INTERRUPTIONS:**
Si l'appelant parle pendant que vous parlez:
- NE vous arrêtez PAS en plein milieu de phrase
- Complétez brièvement votre pensée ou faites une pause naturelle à un point logique
- Ensuite écoutez et répondez à ce que l'appelant a dit
- Ne laissez jamais une réponse incomplète ou coupée de manière gênante

**TERMINER L'APPEL NATURELLEMENT:**
Lorsque la conversation est arrivée à une conclusion naturelle et que l'objectif est atteint:
1. Offrez un au revoir amical: "Ce fut un plaisir de vous parler aujourd'hui. Passez une excellente journée !"
2. Confirmez qu'aucune aide supplémentaire n'est nécessaire
3. Si l'utilisateur confirme qu'il a terminé, invoquez la fonction end_call pour déconnecter poliment Ask user to say goodbye to end the call.
Utilisez end_call quand: l'utilisateur dit au revoir/bye/merci/c'est tout, objectif atteint, ou pas d'autres questions.
""",
        "hi":
        """
**ज्ञान आधार का उपयोग (महत्वपूर्ण):**
जब उपयोगकर्ता उत्पादों, सेवाओं, मूल्य निर्धारण, नीतियों, कंपनी की जानकारी, या व्यवसाय के बारे में किसी भी तथ्यात्मक विवरण के बारे में पूछे, तो आपको जवाब देने से पहले पहले `search_knowledge_base` टूल को कॉल करना चाहिए। प्राप्त जानकारी का उपयोग अपने उत्तर को आधार बनाने के लिए करें। कभी भी ऐसी जानकारी न बनाएं या अनुमान न लगाएं जो ज्ञान आधार में हो सकती है।

**ईमेल पता संग्रह (महत्वपूर्ण - बिल्कुल अनुसरण करें):**
जब आपको ईमेल पता एकत्र करना हो, तो आपको यह बिल्कुल क्रम अनुसरण करना होगा:
1. पहले: `prepare_for_email_input()` फ़ंक्शन को कॉल करें (केवल इसके बारे में बात न करें - आपको वास्तव में फ़ंक्शन को INVOKE करना होगा)
2. फ़ंक्शन के "Audio sensors adjusted" लौटाने की प्रतीक्षा करें
3. केवल तभी उपयोगकर्ता से पूछें: "कृपया अपना ईमेल अक्षर दर अक्षर स्पेल करें। उदाहरण के लिए, j dot smith at the rate g-m-a-i-l dot com। अपना समय लें, मैं सुन रहा हूं।"
4. **पूर्ण मौन मोड - यह महत्वपूर्ण है:**
   - उपयोगकर्ता के स्पेल करते समय किसी भी तरह से बात न करें, स्वीकार न करें, प्रोत्साहित न करें या प्रतिक्रिया न दें
   - न कहें: "मैं हूं", "कृपया जारी रखें", "क्या आप अभी भी हैं?", "बढ़िया", "धन्यवाद", या कुछ भी
   - भले ही वे अक्षरों के बीच 5-10 सेकंड रुकें, चुप रहें
   - भले ही वे "उह" कहें या हिचकिचाएं, प्रतिक्रिया न दें
   - आपका एकमात्र काम पूरा ईमेल पता समाप्त होने तक सुनना है
5. प्रतीक्षा करें जब तक वे "समाप्त" न कहें या "dot com" या "dot org" कहना समाप्त न करें
6. केवल उनके पूरा ईमेल समाप्त करने के बाद, पुष्टि के लिए "dot" और "at the rate" के साथ बोलकर दोहराएं: "मुझे पुष्टि करने दें: j dot smith at the rate g-m-a-i-l dot com, क्या यह सही है?"

**महत्वपूर्ण ईमेल प्रारूप नियम:**
- "at the rate" या "at" = @ प्रतीक
- "dot" = . (बिंदु) - केवल जब उपयोगकर्ता स्पष्ट रूप से "dot" शब्द कहे
- जब उपयोगकर्ता "h a r d i k" (रिक्त स्थान के साथ) स्पेल करे, इसे लिखें: hardik (अक्षरों के बीच कोई बिंदु नहीं)
- जब उपयोगकर्ता "j dot pastel" कहे, इसे लिखें: j.pastel (बिंदु केवल जहां उन्होंने "dot" कहा)
- "hardik" की पुष्टि करते समय, कहें: "h a r d i k" (प्रत्येक अक्षर रिक्त स्थान के साथ, उनके बीच "dot" नहीं)
- "j.pastel" की पुष्टि करते समय, कहें: "j dot pastel" ("dot" केवल जहां वास्तविक बिंदु है)
- अक्षरों के बीच "dot" कभी न जोड़ें जब तक उपयोगकर्ता स्पष्ट रूप से "dot" न कहे
- कभी भी @ या . प्रतीक न बोलें - हमेशा "at the rate" और "dot" बोलें

**यदि उपयोगकर्ता कहे कि ईमेल गलत है:**
जब उपयोगकर्ता कहे "यह गलत है" या "नहीं, यह है..." और फिर से ईमेल स्पेल करना शुरू करे:
1. तुरंत `prepare_for_email_input()` फिर से कॉल करें VAD को फिर से समायोजित करने के लिए
2. फिर चुपचाप सुनें जब वे पूरे ईमेल को फिर से स्पेल करें
3. सही किए गए ईमेल की पुष्टि करें

महत्वपूर्ण: ईमेल स्पेलिंग के दौरान, आपको चुप रहना होगा। प्रत्येक भाग को स्वीकार न करें। उन्हें बिना किसी रुकावट के पूरा ईमेल स्पेल करने दें।

नंबरों को स्पष्ट और सही ढंग से बोलना चाहिए।

अपॉइंटमेंट या कॉलबैक शेड्यूल करते समय, इन सभी तत्वों की पुष्टि अवश्य करें:
- सप्ताह का दिन (जैसे, "बुधवार")
- पूरी तारीख (जैसे, "22 अक्टूबर")
- सटीक समय (जैसे, "दोपहर 1:30 बजे")
- समय क्षेत्र (जैसे, "पूर्वी समय", "प्रशांत समय", "UTC")

स्पष्ट रूप से पूछें: "आप किस समय क्षेत्र में हैं?" या "क्या यह समय आपके स्थानीय समय क्षेत्र में है?"

समय क्षेत्र के साथ पूरी अपॉइंटमेंट दोहराएं: "तो हम बुधवार, 22 अक्टूबर को दोपहर 1:30 बजे पूर्वी समय के लिए पुष्टि कर रहे हैं, क्या यह सही है?"

आंशिक पुष्टि स्वीकार न करें।

मूल्यों को संख्यात्मक रूप से बोलें:
- उदाहरण: $100 → "100 डॉलर"
- €50 → "50 यूरो"

**उच्चारण नियम (ब्रांड नामों के लिए महत्वपूर्ण):**
आपको ब्रांड नाम और तकनीकी शब्दों को सही ढंग से पूर्ण शब्दों के रूप में बोलना होगा, स्पेल आउट नहीं:
- Gmail → "जी-मेल" कहें, कभी भी "जी-एम-ए-आई-एल" स्पेल न करें
- iPhone → "आई-फोन" कहें, कभी भी "आई-पी-एच-ओ-एन-ई" नहीं
- YouTube → "यू-ट्यूब" कहें, कभी भी "वाई-ओ-यू-टी-यू-बी-ई" नहीं
- WiFi → "वाई-फाई" कहें, कभी भी "डब्ल्यू-आई-एफ-आई" नहीं
- LinkedIn → "लिंक्ड-इन" कहें
- WhatsApp → "व्हाट्स-ऐप" कहें
ये सभी उचित नाम हैं जो बातचीत में स्वाभाविक लगने चाहिए। केवल तभी शब्दों को स्पेल करें जब स्पष्ट रूप से कहा जाए।

**बाधा का प्रबंधन:**
यदि कॉलर आपके बोलते समय बोलता है:
- अचानक वाक्य के बीच में न रुकें
- अपना विचार संक्षेप में पूरा करें या तार्किक बिंदु पर स्वाभाविक रूप से रुकें
- फिर सुनें और कॉलर ने जो कहा उसका जवाब दें
- कभी भी प्रतिक्रिया को अधूरा या अजीब तरीके से कटा हुआ न छोड़ें

**कॉल को स्वाभाविक रूप से समाप्त करना:**
जब बातचीत एक स्वाभाविक निष्कर्ष पर पहुंच गई हो और उद्देश्य पूरा हो गया हो:
1. एक मैत्रीपूर्ण विदाई दें: "आज आपसे बात करके बहुत अच्छा लगा। आपका दिन शुभ हो!"
2. पुष्टि करें कि कोई और सहायता की आवश्यकता नहीं है
3. यदि उपयोगकर्ता पुष्टि करता है कि वे समाप्त हो गए हैं, तो कॉल को विनम्रता से डिस्कनेक्ट करने के लिए end_call फ़ंक्शन को लागू करें। उपयोगकर्ता से कॉल समाप्त करने के लिए अलविदा कहने के लिए कहें।
end_call का उपयोग करें जब: उपयोगकर्ता अलविदा/नमस्ते/धन्यवाद/बस इतना ही कहता है, उद्देश्य प्राप्त हो गया है, या कोई और प्रश्न नहीं हैं।
""",
        "ar":
        """
**استخدام قاعدة المعرفة (حاسم):**
عندما يسأل المستخدم عن المنتجات أو الخدمات أو التسعير أو السياسات أو معلومات الشركة أو أي تفاصيل واقعية عن العمل، يجب عليك استدعاء أداة `search_knowledge_base` أولاً قبل الرد. استخدم المعلومات المستردة لتأسيس إجابتك. لا تختلق أبداً أو تخمن المعلومات التي قد تكون في قاعدة المعرفة.

**جمع عنوان البريد الإلكتروني (حاسم - يجب اتباعه بالضبط):**
عندما تحتاج إلى جمع عنوان بريد إلكتروني، يجب عليك اتباع هذا التسلسل بالضبط:
1. أولاً: استدع وظيفة `prepare_for_email_input()` (لا تتحدث عنها فقط - يجب عليك فعلياً استدعاء الوظيفة)
2. انتظر حتى ترجع الوظيفة "Audio sensors adjusted"
3. فقط بعد ذلك اسأل المستخدم: "من فضلك تهجى بريدك الإلكتروني حرفاً بحرف. على سبيل المثال، j dot smith at the rate g-m-a-i-l dot com. خذ وقتك، أنا أستمع."
4. **وضع الصمت المطلق - هذا حاسم:**
   - لا تتحدث أو تعترف أو تشجع أو ترد بأي طريقة أثناء التهجئة
   - لا تقل: "أنا"، "من فضلك تابع"، "هل ما زلت هناك؟"، "رائع"، "شكراً"، أو أي شيء
   - حتى لو توقفوا لمدة 5-10 ثوانٍ بين الحروف، ابق صامتاً
   - حتى لو قالوا "آه" أو ترددوا، لا ترد
   - مهمتك الوحيدة هي الاستماع حتى ينتهوا من عنوان البريد الإلكتروني الكامل
5. انتظر حتى يقولوا "انتهيت" أو ينتهوا من قول "dot com" أو "dot org"
6. فقط بعد أن ينتهوا من البريد الإلكتروني الكامل، كرره للتأكيد بالتهجئة مع "dot" و "at the rate": "دعني أؤكد: j dot smith at the rate g-m-a-i-l dot com، هل هذا صحيح؟"

**قواعد مهمة لصيغة البريد الإلكتروني:**
- "at the rate" أو "at" = رمز @
- "dot" = . (نقطة) - فقط عندما يقول المستخدم كلمة "dot" صراحةً
- عندما يتهجى المستخدم "h a r d i k" (بمسافات)، اكتبها: hardik (بدون نقاط بين الأحرف)
- عندما يقول المستخدم "j dot pastel"، اكتبها: j.pastel (نقطة فقط حيث قالوا "dot")
- عند التأكيد من "hardik"، قل: "h a r d i k" (تهجى كل حرف بمسافات، بدون "dot" بينها)
- عند التأكيد من "j.pastel"، قل: "j dot pastel" (قل "dot" فقط حيث توجد نقطة فعلية)
- لا تضف أبداً "dot" بين الأحرف إلا إذا قال المستخدم "dot" صراحةً
- لا تقل أبداً الرموز @ أو . - قل دائماً "at the rate" و "dot" عند التحدث

**إذا قال المستخدم أن البريد الإلكتروني خاطئ:**
عندما يقول المستخدم "هذا خطأ" أو "لا، إنه..." ويبدأ بتهجئة البريد الإلكتروني مرة أخرى:
1. اتصل فوراً بـ `prepare_for_email_input()` مرة أخرى لإعادة ضبط VAD
2. ثم استمع بصمت بينما يتهجون البريد الإلكتروني بالكامل مرة أخرى
3. أكد البريد الإلكتروني المصحح

حاسم: أثناء تهجئة البريد الإلكتروني، يجب أن تبقى صامتاً. لا تعترف بكل جزء. دعهم يتهجون البريد الإلكتروني بالكامل دون انقطاع.

يجب نطق الأرقام بوضوح وبشكل صحيح.

عند جدولة موعد أو معاودة اتصال، يجب تأكيد جميع هذه العناصر:
- يوم الأسبوع (على سبيل المثال، "الأربعاء")
- التاريخ الكامل (على سبيل المثال، "22 أكتوبر")
- الوقت المحدد (على سبيل المثال، "1:30 مساءً")
- المنطقة الزمنية (على سبيل المثال، "التوقيت الشرقي"، "التوقيت الغربي"، "UTC")

اسأل صراحة: "في أي منطقة زمنية أنت؟" أو "هل هذا الوقت في منطقتك الزمنية المحلية؟"

كرر الموعد الكامل مع المنطقة الزمنية: "إذن نحن نؤكد يوم الأربعاء، 22 أكتوبر في 1:30 مساءً التوقيت الشرقي، هل هذا صحيح؟"

لا تقبل التأكيدات الجزئية.

انطق الأسعار رقمياً:
- مثال: $100 → "100 دولار"
- €50 → "50 يورو"

**قواعد النطق (حاسم لأسماء العلامات التجارية):**
يجب عليك نطق أسماء العلامات التجارية والمصطلحات التقنية بشكل صحيح ككلمات كاملة، وليس مهجأة:
- Gmail → قل "جي-ميل"، لا تتهجى أبداً "G-M-A-I-L"
- iPhone → قل "آي-فون"، لا "آي-بي-إتش-أو-إن-إي"
- YouTube → قل "يو-تيوب"، لا "واي-أو-يو-تي-يو-بي-إي"
- WiFi → قل "واي-فاي"، لا "دبليو-آي-إف-آي"
- LinkedIn → قل "لينكد-إن"
- WhatsApp → قل "واتس-آب"
هذه أسماء علم يجب أن تبدو طبيعية في المحادثة. تهجى الكلمات فقط عندما يُطلب منك ذلك صراحةً.

**التعامل مع المقاطعات:**
إذا تحدث المتصل أثناء حديثك:
- لا تتوقف في منتصف الجملة فجأة
- أكمل فكرتك باختصار أو توقف بشكل طبيعي عند نقطة منطقية
- ثم استمع ورد على ما قاله المتصل
- لا تترك أبداً رداً غير مكتمل أو مقطوعاً بشكل محرج

**إنهاء المكالمة بشكل طبيعي:**
عندما يصل الحديث إلى نهاية طبيعية وتحقق الهدف:
1. قدم وداعاً ودياً: "كان من دواعي سروري التحدث معك اليوم. أتمنى لك يوماً رائعاً!"
2. أكد أنه لا حاجة لمزيد من المساعدة
3. إذا أكد المستخدم أنه انتهى، فقم باستدعاء وظيفة end_call لفصل المكالمة بأدب. اطلب من المستخدم أن يقول وداعاً لإنهاء المكالمة.
استخدم end_call عندما: يقول المستخدم وداعاً/مع السلامة/شكراً/هذا كل شيء، تم تحقيق الهدف، أو لا توجد أسئلة أخرى.
"""
    }

    def __init__(self,
                 call_config: CallConfig,
                 room_name: str = "",
                 participant_identity: str = "") -> None:
        self.call_config = call_config
        self.room_name = room_name
        self.participant_identity = participant_identity
        self._agent_session: Optional[AgentSession] = None
        self._end_call_scheduled = False  # Idempotent guard for end_call

        # Initialize background audio player for typing sounds only if enabled
        self.background_audio = None
        self._background_audio_started = False
        if call_config.keyboard_sound:
            self.background_audio = BackgroundAudioPlayer(thinking_sound=[
                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.6),
                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.5),
            ])
            logger.info("🎵 Keyboard typing sounds enabled for this call")

        os.environ["OPENAI_API_KEY"] = call_config.model.api_key
        os.environ["ELEVEN_API_KEY"] = call_config.tts.api_key

        # Set STT API key based on provider
        if call_config.stt.provider_name.lower() == "openai":
            os.environ[
                "OPENAI_API_KEY"] = call_config.stt.api_key or call_config.model.api_key
        elif call_config.stt.provider_name.lower() == "deepgram":
            os.environ["DEEPGRAM_API_KEY"] = call_config.stt.api_key

        # Get language-specific base prompt (fallback to English for unsupported languages)
        language = call_config.language.lower()
        if language not in self.BASE_AGENT_PROMPTS:
            logger.warning(
                f"Unsupported language '{language}', falling back to English")
            language = "en"
        base_prompt = self.BASE_AGENT_PROMPTS.get(
            language, self.BASE_AGENT_PROMPTS["en"])

        # Extract customer's first name from contact_name
        customer_first_name = call_config.contact_name.split(
        )[0] if call_config.contact_name else "Customer"

        # Build context about date, time, and previous calls (language-specific)
        context_info = ""
        if call_config.current_date or call_config.current_time:
            if language == "es":
                context_info = "\n**FECHA Y HORA ACTUAL:**\n"
                if call_config.current_date:
                    context_info += f"- Fecha de hoy: {call_config.current_date}\n"
                if call_config.current_time:
                    context_info += f"- Hora actual: {call_config.current_time}\n"
            elif language == "fr":
                context_info = "\n**DATE ET HEURE ACTUELLES:**\n"
                if call_config.current_date:
                    context_info += f"- Date d'aujourd'hui: {call_config.current_date}\n"
                if call_config.current_time:
                    context_info += f"- Heure actuelle: {call_config.current_time}\n"
            elif language == "hi":
                context_info = "\n**वर्तमान तारीख और समय:**\n"
                if call_config.current_date:
                    context_info += f"- आज की तारीख: {call_config.current_date}\n"
                if call_config.current_time:
                    context_info += f"- वर्तमान समय: {call_config.current_time}\n"
            elif language == "ar":
                context_info = "\n**التاريخ والوقت الحالي:**\n"
                if call_config.current_date:
                    context_info += f"- تاريخ اليوم: {call_config.current_date}\n"
                if call_config.current_time:
                    context_info += f"- الوقت الحالي: {call_config.current_time}\n"
            else:
                context_info = "\n**CURRENT DATE & TIME:**\n"
                if call_config.current_date:
                    context_info += f"- Today's date: {call_config.current_date}\n"
                if call_config.current_time:
                    context_info += f"- Current time: {call_config.current_time}\n"

        # Build previous call summary if available (language-specific)
        previous_call_context = ""
        if call_config.previous_call_summary:
            if language == "es":
                previous_call_context = f"""

**HISTORIAL DE LLAMADAS ANTERIORES:**
Has hablado con {customer_first_name} antes. Aquí está el historial de conversación:

{call_config.previous_call_summary}

IMPORTANTE: Haz referencia a este historial de forma natural en la conversación. Si mencionaron algo antes, reconócelo. Si dijeron "no interesado" anteriormente, sé respetuoso y breve. Construye continuidad - no repitas lo que ya se discutió.
"""
            elif language == "fr":
                previous_call_context = f"""

**HISTORIQUE DES APPELS PRÉCÉDENTS:**
Vous avez déjà parlé avec {customer_first_name}. Voici l'historique de la conversation:

{call_config.previous_call_summary}

IMPORTANT: Référencez cet historique naturellement dans la conversation. S'ils ont mentionné quelque chose avant, reconnaissez-le. S'ils ont dit "pas intéressé" précédemment, soyez respectueux et bref. Créez de la continuité - ne répétez pas ce qui a déjà été discuté.
"""
            elif language == "hi":
                previous_call_context = f"""

**पिछले कॉल का इतिहास:**
आप {customer_first_name} से पहले बात कर चुके हैं। यहाँ बातचीत का इतिहास है:

{call_config.previous_call_summary}

महत्वपूर्ण: इस इतिहास को बातचीत में स्वाभाविक रूप से संदर्भित करें। यदि उन्होंने पहले कुछ उल्लेख किया था, तो उसे स्वीकार करें। यदि उन्होंने पहले "इच्छुक नहीं" कहा था, तो सम्मानपूर्ण और संक्षिप्त रहें। निरंतरता बनाएं - जो पहले से चर्चा हो चुकी है उसे दोहराएं नहीं।
"""
            elif language == "ar":
                previous_call_context = f"""

**سجل المكالمات السابقة:**
لقد تحدثت مع {customer_first_name} من قبل. إليك سجل المحادثة:

{call_config.previous_call_summary}

مهم: اشر إلى هذا السجل بشكل طبيعي في المحادثة. إذا ذكروا شيئاً من قبل، فاعترف به. إذا قالوا "غير مهتم" سابقاً، كن محترماً ومختصراً. بناء الاستمرارية - لا تكرر ما تم مناقشته بالفعل.
"""
            else:
                previous_call_context = f"""

**PREVIOUS CALL HISTORY:**
You have spoken with {customer_first_name} before. Here's the conversation history:

{call_config.previous_call_summary}

IMPORTANT: Reference this history naturally in the conversation. If they mentioned something before, acknowledge it. If they said "not interested" previously, be respectful and brief. Build continuity - don't repeat what was already discussed.
"""

        # Build voicemail detection instructions if enabled (language-specific)
        voicemail_instructions = ""
        if call_config.voicemail:
            if language == "es":
                voicemail_instructions = f"""

**DETECCIÓN DE BUZÓN DE VOZ (CRÍTICO):**
Escucha atentamente la respuesta inicial cuando se conecte la llamada.
Si detectas CUALQUIERA de estas señales de buzón de voz/contestador automático:
- Frases como "deja un mensaje", "después del tono", "no disponible", "no puede atender"
- Sonidos de pitido
- Mensajes de bienvenida automatizados
- Sin respuesta humana después de 3 segundos

Llama INMEDIATAMENTE a la función detected_answering_machine.
Después de llamarla, di el mensaje de buzón de voz EXACTAMENTE como se indica, luego termina la llamada cortésmente.
"""
            elif language == "fr":
                voicemail_instructions = f"""

**DÉTECTION DE MESSAGERIE VOCALE (CRITIQUE):**
Écoutez attentivement la réponse initiale lorsque l'appel se connecte.
Si vous détectez L'UN de ces signes de messagerie vocale/répondeur automatique:
- Des phrases comme "laisser un message", "après le bip", "non disponible", "ne peut pas répondre"
- Sons de bip
- Messages d'accueil automatisés
- Aucune réponse humaine après 3 secondes

Appelez IMMÉDIATEMENT la fonction detected_answering_machine.
Après l'avoir appelée, dites le message vocal EXACTEMENT comme indiqué, puis terminez l'appel poliment.
"""
            elif language == "hi":
                voicemail_instructions = f"""

**वॉइसमेल डिटेक्शन (महत्वपूर्ण):**
कॉल कनेक्ट होने पर प्रारंभिक प्रतिक्रिया को ध्यान से सुनें।
यदि आप वॉइसमेल/उत्तर देने वाली मशीन के इनमें से किसी भी संकेत का पता लगाते हैं:
- "संदेश छोड़ें", "टोन के बाद", "उपलब्ध नहीं" जैसे वाक्यांश
- बीप की आवाज़
- स्वचालित स्वागत संदेश
- 3 सेकंड के बाद कोई मानवीय प्रतिक्रिया नहीं

तुरंत detected_answering_machine फ़ंक्शन को कॉल करें।
इसे कॉल करने के बाद, वॉइसमेल संदेश को बिल्कुल वैसे ही कहें जैसा निर्देश दिया गया है, फिर कॉल को विनम्रता से समाप्त करें।
"""
            elif language == "ar":
                voicemail_instructions = f"""

**كشف البريد الصوتي (حاسم):**
استمع بعناية إلى الرد الأولي عندما يتصل المكالمة.
إذا اكتشفت أياً من هذه العلامات للبريد الصوتي/جهاز الرد الآلي:
- عبارات مثل "اترك رسالة"، "بعد النغمة"، "غير متاح"، "لا يمكن الرد على الهاتف"
- أصوات صفير
- رسائل ترحيب آلية
- لا رد بشري بعد 3 ثوان

اتصل فوراً بوظيفة detected_answering_machine.
بعد الاتصال بها، قل رسالة البريد الصوتي تماماً كما هو موضح، ثم أنهِ المكالمة بأدب.
"""
            else:
                voicemail_instructions = f"""

**VOICEMAIL DETECTION (CRITICAL):**
Listen carefully to the initial response when the call connects.
If you detect ANY of these signs of voicemail/answering machine:
- Phrases like "leave a message", "at the tone", "not available", "can't come to the phone"
- Beep sounds
- Automated greeting messages
- No human response after 3 seconds

IMMEDIATELY call the detected_answering_machine function.
After calling it, say the voicemail message EXACTLY as instructed, then end the call politely.
"""

        # Build the complete agent prompt by combining base prompt with specific instructions (language-specific)
        if language == "es":
            full_agent_prompt = f"""
Soy un agente. Sigue estas instrucciones cada vez que hables:

- El nombre del cliente es: {customer_first_name} (Usa el primer nombre ocasionalmente durante la conversación, NO en cada oración)
{context_info}
**INSTRUCCIONES BASE DEL AGENTE:**
{base_prompt}

**INSTRUCCIONES ESPECÍFICAS DEL AGENTE PARA ESTA LLAMADA:**
{call_config.agent_prompt_preamble}
{previous_call_context}
{voicemail_instructions}
"""
        elif language == "fr":
            full_agent_prompt = f"""
Je suis un agent. Suivez ces instructions chaque fois que vous parlez:

- Le prénom du client est: {customer_first_name} (Utilisez le prénom occasionnellement pendant la conversation, PAS dans chaque phrase)
{context_info}
**INSTRUCTIONS DE BASE DE L'AGENT:**
{base_prompt}

**INSTRUCTIONS SPÉCIFIQUES DE L'AGENT POUR CET APPEL:**
{call_config.agent_prompt_preamble}
{previous_call_context}
{voicemail_instructions}
"""
        elif language == "hi":
            full_agent_prompt = f"""
मैं एक एजेंट हूं। हर बार बोलते समय इन निर्देशों का पालन करें:

- ग्राहक का पहला नाम है: {customer_first_name} (बातचीत के दौरान कभी-कभार पहले नाम का उपयोग करें, हर वाक्य में नहीं)
{context_info}
**एजेंट के बुनियादी निर्देश:**
{base_prompt}

**इस कॉल के लिए विशिष्ट एजेंट निर्देश:**
{call_config.agent_prompt_preamble}
{previous_call_context}
{voicemail_instructions}
"""
        elif language == "ar":
            full_agent_prompt = f"""
أنا وكيل. اتبع هذه التعليمات في كل مرة تتحدث فيها:

- اسم العميل الأول هو: {customer_first_name} (استخدم الاسم الأول أحياناً أثناء المحادثة، وليس في كل جملة)
{context_info}
**تعليمات الوكيل الأساسية:**
{base_prompt}

**تعليمات الوكيل المحددة لهذه المكالمة:**
{call_config.agent_prompt_preamble}
{previous_call_context}
{voicemail_instructions}
"""
        else:
            full_agent_prompt = f"""
I am an agent. Follow these instructions every time you speak:

- Customer's first name is: {customer_first_name} (Use the first name occasionally during conversation, NOT in every sentence)
{context_info}
**BASE AGENT PROMPT INSTRUCTIONS:**
{base_prompt}

**SPECIFIC AGENT INSTRUCTIONS FOR THIS CALL:**
{call_config.agent_prompt_preamble}
{previous_call_context}
{voicemail_instructions}
"""

        logger.info(
            f"Agent initialized for customer: {customer_first_name}, language: {language}"
        )

        # Initialize knowledge base if enabled
        self.kb = None
        if call_config.use_knowledge_base:
            self.kb = KnowledgeBase(openai_api_key=call_config.model.api_key)
            if self.kb.enabled:
                logger.info("Knowledge base enabled for this call")

        # Choose TTS based on provider
        if call_config.tts.provider_name.lower() in ["openai", "open_ai"]:
            tts_instance = openai.TTS(voice="alloy")
            logger.info("Using OpenAI TTS")
        elif call_config.tts.provider_name.lower() in [
                "smallest", "smallest_ai", "smallestai"
        ]:
            os.environ["SMALLEST_API_KEY"] = call_config.tts.api_key

            tts_instance = smallestai.TTS(
                model=call_config.tts.model_id
                if call_config.tts.model_id else "lightning-large",
                voice_id=call_config.tts.voice_id
                if call_config.tts.voice_id else "irisha",
                api_key=call_config.tts.api_key,
                sample_rate=24000,
                speed=1.0,
                consistency=0.5,
                similarity=0.7,
                enhancement=0.0,
            )
            logger.info(
                f"Using Smallest.ai TTS with model: {call_config.tts.model_id or 'lightning-large'}, "
                f"voice_id: {call_config.tts.voice_id or 'irisha'}, sample_rate: 24000"
            )
        else:
            if language in ["es", "fr", "hi", "ar"]:
                elevenlabs_model = "eleven_multilingual_v2"
            else:
                elevenlabs_model = "eleven_turbo_v2_5"

            if call_config.tts.model_id and call_config.tts.model_id != elevenlabs_model:
                logger.info(
                    f"User provided model '{call_config.tts.model_id}' but using '{elevenlabs_model}' based on language '{language}'"
                )

            tts_instance = elevenlabs.TTS(
                voice_id=call_config.tts.voice_id,
                model=elevenlabs_model,
                api_key=call_config.tts.api_key,
                streaming_latency=2,
                chunk_length_schedule=[120, 160, 250, 290],
                enable_ssml_parsing=False,
            )
            logger.info(
                f"✅ Using ElevenLabs TTS with model: {elevenlabs_model} (language: {language}), voice_id: {call_config.tts.voice_id}"
            )

        # Choose STT based on provider (use resolved language, not call_config.language)
        if call_config.stt.provider_name.lower() == "openai":
            # OpenAI STT - uses gpt-4o-transcribe model (recommended)
            # Uses OPENAI_API_KEY environment variable (already set above)
            openai_model = call_config.stt.model if call_config.stt.model not in [
                "nova-2", "nova", "deepgram"
            ] else "gpt-4o-transcribe"

            stt_instance = openai.STT(
                model=openai_model,
                language=language,  # Use resolved language (with fallback)
            )
            logger.info(
                f"Using OpenAI STT with model: {openai_model}, language: {language}"
            )
        elif call_config.stt.provider_name.lower() == "deepgram":
            # Deepgram STT (default)
            stt_instance = deepgram.STT(
                model=call_config.stt.model,
                api_key=call_config.stt.api_key,
                language=language,  # Use resolved language (with fallback)
            )
            logger.info(
                f"Using Deepgram STT with model: {call_config.stt.model}, language: {language}"
            )
        else:
            # Fallback to Deepgram if unknown provider
            logger.warning(
                f"Unknown STT provider '{call_config.stt.provider_name}', falling back to Deepgram"
            )

            # Use environment Deepgram key for fallback (don't reuse the invalid provider's key)
            deepgram_key = os.getenv("DEEPGRAM_API_KEY")
            if not deepgram_key:
                raise ValueError(
                    f"Unknown STT provider '{call_config.stt.provider_name}' and no DEEPGRAM_API_KEY found for fallback"
                )

            stt_instance = deepgram.STT(
                model="nova-2",
                api_key=deepgram_key,
                language=language,
            )
            logger.info(
                f"Using Deepgram STT (fallback) with model: nova-2, language: {language}"
            )

        # Create tools list (add RAG tool if knowledge base is enabled)
        agent_tools = []

        # Add voicemail detection tool if enabled
        if call_config.voicemail:
            # Language-specific default voicemail messages
            default_voicemail_messages = {
                "es":
                "Hola, devuélveme la llamada cuando recibas este mensaje.",
                "fr": "Bonjour, rappelez-moi quand vous recevrez ce message.",
                "hi": "नमस्ते, जब आपको यह संदेश मिले तो मुझे वापस कॉल करें।",
                "ar": "مرحباً، اتصل بي عندما تتلقى هذه الرسالة.",
                "en": "Hi, call me back when you reach this message."
            }
            voicemail_msg = call_config.voicemail_message or default_voicemail_messages.get(
                language, default_voicemail_messages["en"])

            @function_tool()
            async def detected_answering_machine() -> str:
                """Call this function if you detect an answering machine or voicemail system.
                Listen for phrases like 'leave a message', 'at the tone', 'not available', beep sounds, or automated greetings."""
                return f"Voicemail detected. Say exactly: {voicemail_msg}"

            agent_tools.append(detected_answering_machine)
            logger.info(
                f"Voicemail detection enabled with message: {voicemail_msg[:50]}..."
            )

        # Capture knowledge base in local variable for type checker
        kb = self.kb
        if kb is not None and kb.enabled:
            # Create RAG function tool
            @function_tool()
            async def search_knowledge_base(query: str) -> str:
                """Search the company knowledge base for relevant information based on the user's question.
                Use this tool when the user asks questions about company information, products, services, or policies."""
                # Play typing sound while searching knowledge base (if enabled)
                if self._background_audio_started and self.background_audio:
                    try:
                        self.background_audio.play(
                            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2,
                                        volume=0.5))
                        logger.info(
                            "⌨️ Playing typing sound - searching knowledge base"
                        )
                    except Exception as e:
                        logger.debug(f"Failed to play typing sound: {e}")

                return await kb.search(query,
                                       top_k=call_config.knowledge_base_top_k)

            agent_tools.append(search_knowledge_base)
            logger.info("RAG function tool enabled for knowledge base queries")

        # Add call transfer tool if enabled
        if call_config.enable_call_transfer and call_config.transfer_phone_number:
            transfer_number = call_config.transfer_phone_number

            # Language-specific transfer confirmation messages
            transfer_confirmations = {
                "es": "Transfiriendo al agente humano...",
                "fr": "Transfert vers un agent humain...",
                "hi": "मानव एजेंट को स्थानांतरित किया जा रहा है...",
                "ar": "جارٍ التحويل إلى وكيل بشري...",
                "en": "Transferring to human agent..."
            }
            transfer_confirmation_msg = transfer_confirmations.get(
                language, transfer_confirmations["en"])

            @function_tool()
            async def transfer_to_human(
                reason: str = "User requested to speak with a human agent"
            ) -> str:
                """Transfer the call to a human agent when the user requests to speak with a real person or needs human assistance.
                Use this when the user explicitly asks to talk to someone, speak to a human, or get transferred to support."""
                if not self._agent_session:
                    # Language-specific unavailable messages
                    unavailable_messages = {
                        "es": "Transferencia no disponible en este momento",
                        "fr": "Transfert non disponible pour le moment",
                        "hi": "स्थानांतरण इस समय उपलब्ध नहीं है",
                        "ar": "التحويل غير متاح في الوقت الحالي",
                        "en": "Transfer not available at this moment"
                    }
                    return unavailable_messages.get(language,
                                                    unavailable_messages["en"])

                await handle_transfer(self.room_name,
                                      self.participant_identity,
                                      transfer_number, self._agent_session,
                                      language)
                return transfer_confirmation_msg

            agent_tools.append(transfer_to_human)
            logger.info(f"Call transfer enabled to {transfer_number}")
        elif call_config.enable_call_transfer and not call_config.transfer_phone_number:
            logger.warning(
                "Call transfer enabled but no transfer_phone_number configured"
            )

        # Add end_call tool (always available for natural call endings)
        # Language-specific goodbye confirmation messages
        goodbye_messages = {
            "es": "Entendido. Gracias por tu tiempo. ¡Adiós!",
            "fr": "Compris. Merci pour votre temps. Au revoir !",
            "hi": "समझ गया। आपके समय के लिए धन्यवाद। अलविदा!",
            "ar": "مفهوم. شكراً لوقتك. وداعاً!",
            "en": "Understood. Thank you for your time. Goodbye!"
        }
        goodbye_msg = goodbye_messages.get(language, goodbye_messages["en"])

        @function_tool()
        async def end_call() -> str:
            """End the call gracefully when the conversation has naturally concluded.
            Use this when the user says goodbye, thanks, that's all, or when the objective is achieved and no further help is needed."""
            if not self._agent_session:
                logger.warning("end_call invoked but no active session")
                return "Call ending..."

            # Idempotent guard - only schedule deletion once
            if self._end_call_scheduled:
                logger.info(
                    "end_call already scheduled, skipping duplicate request")
                return goodbye_msg

            try:
                logger.info(
                    "🔚 end_call invoked - scheduling room deletion after final message"
                )
                self._end_call_scheduled = True

                # Schedule room deletion after a brief delay to allow the goodbye message to be spoken
                async def delete_room_after_delay():
                    # Wait for the goodbye message to be spoken (2-3 seconds is typically enough)
                    await asyncio.sleep(3.0)

                    try:
                        # Delete the room to disconnect all participants
                        livekit_api_client = api.LiveKitAPI(
                            url=LIVEKIT_URL,
                            api_key=LIVEKIT_API_KEY,
                            api_secret=LIVEKIT_API_SECRET)

                        await livekit_api_client.room.delete_room(
                            api.DeleteRoomRequest(room=self.room_name))

                        await livekit_api_client.aclose()

                        logger.info(
                            f"✅ Room {self.room_name} deleted successfully - all participants disconnected"
                        )
                    except Exception as e:
                        logger.error(f"❌ Error deleting room: {e}")
                        import traceback
                        logger.error(traceback.format_exc())

                # Schedule the deletion asynchronously so we can return immediately
                asyncio.create_task(delete_room_after_delay())

            except Exception as e:
                logger.error(f"❌ Error during end_call: {e}")
                import traceback
                logger.error(traceback.format_exc())

            return goodbye_msg

        agent_tools.append(end_call)
        logger.info("Natural call ending tool (end_call) enabled")

        # Add dynamic VAD tool for email input (always available)
        @function_tool()
        async def prepare_for_email_input() -> str:
            """MUST be called immediately BEFORE asking the user to spell their email address.
            This tool adjusts the audio sensors to allow for pauses between letters when spelling email.
            Call this BEFORE saying 'Can you spell your email' or 'Please provide your email address'."""
            if self._agent_session:
                # INCREASE delay to 3.0 seconds (allows long pauses between letters)
                self._agent_session.options.min_endpointing_delay = 3.0
                logger.info("👂 VAD sensitivity lowered to 3.0s: Ready for email spelling with pauses")
                return "Audio sensors adjusted for email input. Now ask the user to spell their email letter by letter."
            return "Session not active."

        agent_tools.append(prepare_for_email_input)
        logger.info("Dynamic VAD tool (prepare_for_email_input) enabled")

        super().__init__(
            instructions=full_agent_prompt,
            stt=stt_instance,
            llm=openai.LLM(
                model=call_config.model.name,
                temperature=call_config.temperature,
            ),
            tts=tts_instance,
            tools=agent_tools,  # Add RAG tool
        )


def prewarm(proc: JobProcess):
    """Prewarm function to load VAD model"""
    proc.userdata["vad"] = silero.VAD.load()


async def analyze_tags_with_llm(
        full_transcript: str, user_tags: list[str], system_tags: list[str],
        call_duration_seconds: int, openai_api_key: str, current_utc_time: str
) -> tuple[list[str], list[str], bool, str | None]:
    """
    Use LLM to analyze which tags match the conversation content and detect callback requests
    
    Args:
        full_transcript: Full conversation transcript
        user_tags: List of user-defined tags to check
        system_tags: List of system-defined tags to check
        call_duration_seconds: Call duration in seconds
        openai_api_key: OpenAI API key
        current_utc_time: Current UTC time for callback time calculation
    
    Returns:
        Tuple of (user_tags_found, system_tags_found, callback_requested, callback_time)
    """
    # Skip if no tags to analyze
    if not user_tags and not system_tags:
        return [], [], False, None

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=openai_api_key)

        # Build analysis prompt
        prompt = f"""You are analyzing a phone conversation transcript to determine which tags are relevant and if a callback was requested.

Current UTC Time: {current_utc_time}
Call Duration: {call_duration_seconds} seconds ({call_duration_seconds // 60} minutes {call_duration_seconds % 60} seconds)

Transcript:
{full_transcript}

User Tags (check if the conversation topic/context matches):
{json.dumps(user_tags, indent=2)}

System Tags (check if the condition described in the tag is met):
{json.dumps(system_tags, indent=2)}

Analyze the transcript and determine:
1. Which tags apply (for user tags check conversation topics, for system tags check conditions)
2. Please make sure that user has asked for callback from agent that is user is busy or if he says to give a call afterwards only then callback_requested should be true not for the agents services.
3. If callback requested, extract the preferred time and round to nearest 15-minute interval (:00, :15, :30, or :45). Also make sure to ask which time zone is user talking about and then convert that time zone to UTC and then send UTC time zone in callback_time.

Respond with ONLY a JSON object in this exact format:
{{
  "user_tags_found": ["tag1", "tag2"],
  "system_tags_found": ["tag3"],
  "callback_requested": true,
  "callback_time": "2025-11-05T14:30:00Z"
}}

IMPORTANT:
- callback_time must be in UTC ISO format (YYYY-MM-DDTHH:MM:SSZ) with minutes at :00, :15, :30, or :45 only
- If no specific time mentioned, ask for timing or if no time he gives then suggest him reasonable time (e.g., next business day at 10:00 AM UTC)
- If no callback requested, set callback_requested to false and callback_time to null"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role":
                "system",
                "content":
                "You are a precise conversation analyst. Respond only with valid JSON."
            }, {
                "role": "user",
                "content": prompt
            }],
            temperature=0.1,
            max_tokens=500)

        # Parse response with proper None checking
        message_content = response.choices[0].message.content
        if not message_content:
            logger.error("❌ OpenAI returned empty content for tag analysis")
            return [], [], False, None

        result_text = message_content.strip()

        # Extract JSON from response (handle markdown code blocks)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split(
                "```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()

        result = json.loads(result_text)

        user_tags_found = result.get("user_tags_found", [])
        system_tags_found = result.get("system_tags_found", [])
        callback_requested = result.get("callback_requested", False)
        callback_time = result.get("callback_time", None)

        logger.info(
            f"🏷️  Tag analysis: user={user_tags_found}, system={system_tags_found}, callback={callback_requested}, time={callback_time}"
        )

        return user_tags_found, system_tags_found, callback_requested, callback_time

    except Exception as e:
        logger.error(f"❌ Failed to analyze tags with LLM: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return [], [], False, None


async def entrypoint(ctx: JobContext):
    """Agent entrypoint for handling voice calls"""
    logger.info(f"Agent starting for room: {ctx.room.name}")

    call_start_time = datetime.utcnow()
    call_id = ctx.room.name

    call_config = load_call_config(ctx.room.name)
    if not call_config:
        logger.warning(f"No config found for room {ctx.room.name}")

        try:
            metadata = json.loads(ctx.job.metadata) if ctx.job.metadata else {}
            phone_number = metadata.get("phone_number")
            contact_name = metadata.get("contact_name", "User")
            user_speak_first = metadata.get("user_speak_first", True)

            logger.info(
                f"Using metadata: phone={phone_number}, name={contact_name}")

            from src.models import TTSConfig, STTConfig, ModelConfig
            call_config = CallConfig(
                to_phone=phone_number or "+1234567890",
                from_phone="+0987654321",
                twilio_account_sid="default",
                twilio_auth_token="default",
                contact_name=contact_name,
                agent_initial_message=
                f"Hello {contact_name}! How can I help you today?",
                agent_prompt_preamble="You are a helpful assistant.",
                voicemail_message="Please call back",
                user_speak_first=user_speak_first,
                webhook_url=None,
                previous_call_summary=None,
                current_date=None,
                current_time=None,
                enable_call_transfer=False,
                transfer_phone_number=None,
                livekit_sip_trunk_id=os.getenv("LIVEKIT_SIP_TRUNK_ID", ""),
                tts=TTSConfig(provider_name="eleven_labs",
                              voice_id="21m00Tcm4TlvDq8ikWAM",
                              model_id="eleven_turbo_v2_5",
                              api_key=os.getenv("ELEVEN_API_KEY", "")),
                stt=STTConfig(provider_name="deepgram",
                              model="nova-2",
                              api_key=os.getenv("DEEPGRAM_API_KEY", "")),
                model=ModelConfig(name="gpt-4o-mini",
                                  api_key=os.getenv("OPENAI_API_KEY", "")),
            )
        except Exception as e:
            logger.error(f"Error parsing metadata: {e}")
            raise

    # Start call recording BEFORE connecting (LiveKit requirement)
    recording_info = None
    if call_config.recording:
        gcs_bucket = os.getenv("GCS_BUCKET_NAME")
        gcs_credentials = os.getenv("GCS_SERVICE_ACCOUNT_JSON")

        if gcs_bucket and gcs_credentials:
            logger.info("📹 Recording enabled - starting room recording")
            try:
                # Generate GCS file path
                date_prefix = datetime.now().strftime("%Y/%m/%d")
                timestamp = datetime.now().strftime("%H%M%S")
                gcs_filename = f"recordings/{date_prefix}/{call_id}_{timestamp}.mp4"

                # Set up recording to Google Cloud Storage
                req = api.RoomCompositeEgressRequest(
                    room_name=ctx.room.name,
                    audio_only=True,
                    file_outputs=[
                        api.EncodedFileOutput(
                            file_type=api.EncodedFileType.MP4,
                            filepath=gcs_filename,
                            gcp=api.GCPUpload(
                                credentials=gcs_credentials,
                                bucket=gcs_bucket,
                            ),
                        )
                    ],
                )

                lkapi = api.LiveKitAPI()
                egress_info = await lkapi.egress.start_room_composite_egress(
                    req)
                await lkapi.aclose()

                recording_info = {
                    "egress_id": egress_info.egress_id,
                    "gcs_filename": gcs_filename,
                    "gcs_bucket": gcs_bucket
                }

                logger.info(
                    f"✅ Recording started: egress_id={egress_info.egress_id}, path={gcs_filename}"
                )

            except Exception as e:
                logger.error(f"❌ Failed to start recording: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            logger.warning(
                "⚠️ Recording enabled but GCS credentials not configured")

    # NOW connect to the room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Register room event listeners for SIP diagnostics
    @ctx.room.on("participant_attributes_changed")
    def on_attributes_changed(changed_attributes, participant_obj):
        """Log all SIP attribute changes in real-time for debugging"""
        sip_attrs = {k: v for k, v in changed_attributes.items() if k.startswith("sip.")}
        if sip_attrs:
            logger.info(f"🔄 SIP attribute change for {participant_obj.identity}: {sip_attrs}")
            logger.info(f"   All current attributes: {dict(participant_obj.attributes)}")

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant_obj):
        """Log when a participant disconnects with all available SIP info"""
        logger.warning(f"👋 Participant disconnected: {participant_obj.identity}")
        logger.warning(f"   Kind: {participant_obj.kind}")
        logger.warning(f"   Final attributes: {dict(participant_obj.attributes)}")
        sip_status = participant_obj.attributes.get("sip.callStatus", "unknown")
        sip_code = participant_obj.attributes.get("sip.statusCode", "unknown")
        sip_reason = participant_obj.attributes.get("sip.disconnectReason", "unknown")
        logger.warning(f"   SIP status={sip_status}, code={sip_code}, reason={sip_reason}")

    # Wait for SIP participant to join
    participant = await ctx.wait_for_participant()
    logger.info(
        f"📞 Participant {participant.identity} joined - waiting for pickup...")
    logger.info(f"   Initial attributes: {dict(participant.attributes)}")

    # Monitor sip.callStatus to detect when user actually picks up
    # This prevents the agent from speaking before the user answers
    if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
        logger.info(
            "⏳ Monitoring sip.callStatus - waiting for 'active' status...")

        # Wait for call status to become "active" (user picked up)
        # Also detect failures: if status changes to a terminal state or
        # the participant disconnects, stop waiting and handle gracefully.
        max_wait_seconds = 120  # Max 2 minutes for ringing/dialing before giving up
        elapsed = 0.0
        call_connected = False

        while elapsed < max_wait_seconds:
            current_status = participant.attributes.get("sip.callStatus", "unknown")

            if current_status == "active":
                call_connected = True
                break

            # Check for terminal SIP states that indicate call failure
            if current_status in ("disconnected", "hangup", "failed", "error", "automation"):
                logger.warning(
                    f"❌ SIP call ended during dialing with status: {current_status}")
                # Log any SIP disconnect reason if available
                disconnect_reason = participant.attributes.get("sip.disconnectReason", "unknown")
                sip_code = participant.attributes.get("sip.statusCode", "unknown")
                logger.warning(
                    f"   SIP disconnect reason: {disconnect_reason}, SIP code: {sip_code}")
                logger.warning(f"   All SIP attributes: {dict(participant.attributes)}")
                break

            # Check if participant is still in the room
            if participant.identity not in [
                p.identity for p in ctx.room.remote_participants.values()
            ]:
                logger.warning(
                    f"❌ SIP participant {participant.identity} left the room while still '{current_status}'")
                logger.warning(f"   Last known SIP attributes: {dict(participant.attributes)}")
                break

            await asyncio.sleep(0.5)
            elapsed += 0.5

            # Log status periodically (every 5 seconds instead of every 0.5s)
            if int(elapsed * 2) % 10 == 0:
                logger.info(
                    f"⏳ SIP call status: {current_status} (waiting {elapsed:.0f}s)")

        if not call_connected:
            logger.error(f"❌ SIP call was NOT answered after {elapsed:.0f}s")
            logger.error(f"   Last sip.callStatus: {participant.attributes.get('sip.callStatus', 'unknown')}")
            logger.error(f"   All participant attributes: {dict(participant.attributes)}")

            # Send webhook notification about failed call
            if call_config.webhook_url:
                try:
                    call_end_time = datetime.utcnow()
                    # Use 0 for failed calls (never connected)
                    duration_seconds = 0
                    await webhook_sender.send_call_ended(
                        call_config.webhook_url,
                        call_id,
                        duration_seconds,
                        call_start_time,
                        call_end_time,
                        is_voicemail=False,
                        is_rejected=True,
                        call_outcome="not_answered",
                        end_reason=f"SIP call failed: {participant.attributes.get('sip.callStatus', 'unknown')}"
                    )
                except Exception as e:
                    logger.error(f"Failed to send call-failed webhook: {e}")

            # Clean up - shut down the agent since the call never connected
            logger.info("🔚 Shutting down agent - call was not answered")
            ctx.shutdown()
            return

        logger.info("✅ Call is now active - user picked up!")

        # Additional buffer for audio stability and initial message delay
        await asyncio.sleep(3.0)
    else:
        # Non-SIP participant, use old behavior
        logger.info("⏳ Waiting for audio track to stabilize...")
        await asyncio.sleep(2.0)

    logger.info(f"✅ Call fully connected, starting voice assistant")

    # Send PHONE_CALL_CONNECTED webhook
    if call_config.webhook_url:
        await webhook_sender.send_call_connected(call_config.webhook_url,
                                                 call_id, call_start_time)
    else:
        logger.info("No webhook_url configured - webhooks disabled")

    session_kwargs = dict(
        vad=ctx.proc.userdata["vad"],
        min_endpointing_delay=0.5,
        max_endpointing_delay=6.0,
        turn_detection=MultilingualModel()
    )

    session = AgentSession(**session_kwargs)

    # Track full transcript for TRANSCRIPT_COMPLETE webhook
    call_transcript = []

    # ── Pipeline latency analytics ──────────────────────────────────────
    usage_collector = lk_metrics.UsageCollector()
    last_eou_metrics: lk_metrics.EOUMetrics | None = None

    @session.on("metrics_collected")
    def _on_metrics_collected(ev):
        """Log per-component latency so we can see what causes delays."""
        nonlocal last_eou_metrics
        if ev.metrics.type == "eou_metrics":
            last_eou_metrics = ev.metrics  # Store latest EOU metrics for summary at end
        m = ev.metrics
        # Use duck-typing checks to identify metric type
        if hasattr(m, 'ttft') and hasattr(m, 'completion_tokens'):
            # LLM metrics
            logger.info(
                f"📊 LLM  | ttft={m.ttft:.3f}s  duration={m.duration:.3f}s  "
                f"tokens_in={m.prompt_tokens}  tokens_out={m.completion_tokens}  "
                f"tps={m.tokens_per_second:.1f}"
            )
        elif hasattr(m, 'ttfb') and hasattr(m, 'characters_count'):
            # TTS metrics
            logger.info(
                f"📊 TTS  | ttfb={m.ttfb:.3f}s  duration={m.duration:.3f}s  "
                f"audio={m.audio_duration:.2f}s  chars={m.characters_count}  "
                f"streamed={m.streamed}"
            )
        elif hasattr(m, 'end_of_utterance_delay'):
            # EOU (end-of-utterance / turn detection) metrics
            logger.info(
                f"📊 EOU  | eou_delay={m.end_of_utterance_delay:.3f}s  "
                f"transcription_delay={m.transcription_delay:.3f}s"
            )
        elif hasattr(m, 'audio_duration') and hasattr(m, 'streamed'):
            # STT metrics
            logger.info(
                f"📊 STT  | audio_duration={m.audio_duration:.2f}s  "
                f"duration={m.duration:.3f}s  streamed={m.streamed}"
            )
        elif hasattr(m, 'inference_count'):
            # VAD metrics – only log periodically to avoid noise
            logger.debug(
                f"📊 VAD  | inferences={m.inference_count}  "
                f"inference_time={m.inference_duration_total:.3f}s"
            )
        usage_collector.collect(m)

    # Log aggregated usage summary when the job shuts down
    async def _log_usage_summary():
        summary = usage_collector.get_summary()
        logger.info(f"📊 Call usage summary: {summary}")

    ctx.add_shutdown_callback(_log_usage_summary)
    # ────────────────────────────────────────────────────────────────────

    @session.on("agent_speech_interrupted")
    def on_agent_speech_interrupted(event):
        """Log when agent speech is interrupted"""
        logger.info(f"🔇 Agent speech interrupted by user")

    @session.on("agent_speech_committed")
    def on_agent_speech_committed(event):
        """Log successful agent speech completion"""
        logger.debug(f"✅ Agent speech committed successfully")

    # Debug: log user speech and state changes to verify conversation pipeline
    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        logger.info(
            f"🎤 User speech transcribed: is_final={event.is_final}, text={event.transcript[:80] if event.transcript else ''}..."
        )

    @session.on("user_state_changed")
    def on_user_state_changed(event):
        logger.info(f"👤 User state: {event.new_state}")

    @session.on("agent_state_changed")
    def on_agent_state_changed(event):
        logger.info(f"🤖 Agent state: {event.new_state}")

    # Setup transcript handler
    @session.on("conversation_item_added")
    def on_conversation_item(event):
        """Send webhook when conversation item is added (both user and agent)"""
        item = event.item
        logger.info(
            f"Conversation item: role={item.role}, content={item.text_content[:50] if item.text_content else 'None'}..."
        )

        if item.text_content:
            # Map all possible agent roles to "bot"
            if item.role in ["assistant", "agent", "system"]:
                sender = "bot"
            else:
                sender = "user"
                
                # RESET VAD SENSITIVITY only if we're NOT in email collection mode
                # Check if the last bot message was about email spelling
                if session.options.min_endpointing_delay > 1.0:
                    # Look at recent transcript to see if we're still collecting email
                    still_collecting_email = False
                    if len(call_transcript) > 0:
                        # Check last 2 bot messages for email-related keywords
                        recent_bot_messages = [
                            msg['text'].lower() for msg in call_transcript[-3:]
                            if msg['sender'] == 'bot'
                        ]
                        email_keywords = ['spell', 'email', 'letter by letter', 'at the rate', 'dot com', 'dot', '@']
                        still_collecting_email = any(
                            any(keyword in msg for keyword in email_keywords)
                            for msg in recent_bot_messages
                        )
                    
                    # Only reset if we're clearly done with email collection
                    if not still_collecting_email:
                        session.options.min_endpointing_delay = 0.5
                        logger.info("👂 VAD sensitivity restored to normal (0.5s) - email collection complete")

                # Detect if user is providing structured data (email, phone, appointment details)
                # Play typing sound to indicate agent is noting it down
                text_lower = item.text_content.lower()
                data_keywords = [
                    '@',
                    'dot com',
                    'dot org',
                    'gmail',
                    'yahoo',
                    'hotmail',  # Email indicators
                    'appointment',
                    'schedule',
                    'meeting',
                    'calendar',  # Appointment indicators
                    'phone',
                    'number',
                    'call me',
                    'contact',  # Phone indicators
                    'name is',
                    'my name',
                    "i'm",
                    'called',  # Name indicators
                    'address',
                    'street',
                    'city',
                    'zip',  # Address indicators
                ]

                if any(keyword in text_lower for keyword in data_keywords):
                    # User is providing important data - play typing sound (if enabled)
                    if assistant._background_audio_started and assistant.background_audio:
                        try:
                            assistant.background_audio.play(
                                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING,
                                            volume=0.6))
                            logger.info(
                                "⌨️ Playing typing sound - user providing data"
                            )
                        except Exception as e:
                            logger.debug(f"Failed to play typing sound: {e}")

            # Add to transcript history
            call_transcript.append({
                "sender": sender,
                "text": item.text_content
            })

            # Send live transcript webhook
            if call_config.webhook_url:
                logger.info(f"Sending transcript webhook [{sender}]")
                asyncio.create_task(
                    webhook_sender.send_live_transcript(
                        call_config.webhook_url,
                        call_id,
                        item.text_content,
                        sender,
                        is_partial=
                        True  # True because these are live/partial transcripts during ongoing call
                    ))

    assistant = VoiceAssistant(call_config=call_config,
                               room_name=ctx.room.name,
                               participant_identity=participant.identity)
    assistant._agent_session = session

    # Explicitly link session to the SIP participant so the agent receives their audio.
    # Without this, the default "first participant" may be wrong and the agent won't hear.
    room_input_options = room_io.RoomInputOptions(
        participant_identity=participant.identity,
    )
    logger.info(
        f"🔗 Linking AgentSession to participant: {participant.identity} (kind={participant.kind})"
    )

    try:
        await session.start(
            room=ctx.room,
            agent=assistant,
            room_input_options=room_input_options,
        )

        logger.info("✅ Voice agent started successfully")
    
    except Exception as e:
        logger.error(f"❌ Failed to start voice agent: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Send failure webhook if configured
        if call_config.webhook_url:
            try:
                await webhook_sender.send_call_ended(
                    call_config.webhook_url,
                    call_id,
                    0,  # duration_seconds
                    call_start_time,
                    datetime.utcnow(),
                    is_voicemail=False,
                    is_rejected=True,
                    call_outcome="agent_initialization_failed",
                    end_reason=f"Failed to start agent: {str(e)[:100]}"
                )
            except Exception as webhook_error:
                logger.error(f"Failed to send failure webhook: {webhook_error}")
        
        ctx.shutdown()
        return

    # Debug: verify RoomIO linked to correct participant
    try:
        linked = session.room_io.linked_participant
        if linked:
            logger.info(f"✅ RoomIO linked to: {linked.identity}")
        else:
            logger.warning("⚠️ RoomIO linked_participant is None (may resolve shortly)")
    except Exception as e:
        logger.debug(f"Could not check linked participant: {e}")

    # Start background audio player for typing sounds (only if enabled)
    if assistant.background_audio:
        try:
            await assistant.background_audio.start(room=ctx.room,
                                                   agent_session=session)
            assistant._background_audio_started = True
            logger.info(
                "🎵 Background audio player started (typing sounds enabled)")
        except Exception as e:
            logger.warning(f"⚠️ Failed to start background audio player: {e}")

    # Send initial greeting if agent should speak first
    if not call_config.user_speak_first:
        # No additional delay needed - we already waited for sip.callStatus="active" + 1.5s buffer
        logger.info("🤖 Agent will speak first - delivering initial message...")

        # Replace placeholders in initial message (support various case formats)
        initial_message = call_config.agent_initial_message
        placeholders = [
            "{customer name}", "{Customer Name}", "{CUSTOMER NAME}",
            "{contact_name}", "{Contact_Name}", "{CONTACT_NAME}",
            "{customer_name}", "{Customer_name}"
        ]
        for placeholder in placeholders:
            initial_message = initial_message.replace(placeholder,
                                                      call_config.contact_name)

        logger.info(f"🤖 Agent speaking: {initial_message[:50]}...")

        # Use session.say() with allow_interruptions=False for outbound calls
        # This ensures the agent completes the entire initial message without being cut off
        await session.say(initial_message, allow_interruptions=False)

    # Keep running and handle disconnect
    async def handle_disconnect():
        """Handle call end webhooks"""
        call_end_time = datetime.utcnow()
        duration_seconds = int(
            (call_end_time - call_start_time).total_seconds())
        logger.info(f"Call ended. Duration: {duration_seconds}s")

        # Wait for recording to complete and get URL if recording was enabled
        recording_url = None
        if recording_info:
            logger.info(
                "📹 Waiting for recording to complete and upload to GCS...")
            try:
                # Wait for recording to finish uploading and generate signed URL
                recording_url = await recording_manager.wait_for_recording_completion(
                    egress_id=recording_info['egress_id'],
                    gcs_filename=recording_info['gcs_filename'],
                    max_wait_seconds=60,
                    poll_interval=2.0)
                if recording_url:
                    logger.info(
                        f"✅ Recording URL ready: {recording_url[:100]}...")
                else:
                    logger.warning(
                        "⚠️ Recording URL not available (timeout or failed)")
            except Exception as e:
                logger.error(f"❌ Error waiting for recording: {e}")

        # Send PHONE_CALL_ENDED webhook with recording URL
        if call_config.webhook_url:
            try:
                await webhook_sender.send_call_ended(
                    call_config.webhook_url,
                    call_id,
                    duration_seconds,
                    call_start_time,
                    call_end_time,
                    is_voicemail=False,
                    is_rejected=False,
                    call_outcome="completed",
                    end_reason="unknown",
                    recording_url=recording_url)
            except Exception as e:
                logger.error(f"Error sending end webhook: {e}")

        # Build full transcript and send TRANSCRIPT_COMPLETE webhook
        if call_config.webhook_url:
            try:
                # Format full transcript as "BOT: text\nUSER: text\n..."
                transcript_lines = []
                for item in call_transcript:
                    sender_label = item['sender'].upper()
                    transcript_lines.append(f"{sender_label}: {item['text']}")

                full_transcript = "\n".join(transcript_lines)

                # Prepare recording URLs as a list
                recording_urls = [recording_url] if recording_url else []

                # Analyze tags and callback information with LLM if tags are provided
                user_tags_found = []
                system_tags_found = []
                callback_requested = False
                callback_time = None

                if call_config.user_tags or call_config.system_tags:
                    logger.info(
                        f"🏷️  Analyzing tags: user={call_config.user_tags}, system={call_config.system_tags}"
                    )
                    current_utc = datetime.utcnow().strftime(
                        "%Y-%m-%dT%H:%M:%SZ")
                    user_tags_found, system_tags_found, callback_requested, callback_time_str = await analyze_tags_with_llm(
                        full_transcript=full_transcript,
                        user_tags=call_config.user_tags,
                        system_tags=call_config.system_tags,
                        call_duration_seconds=duration_seconds,
                        openai_api_key=call_config.model.api_key,
                        current_utc_time=current_utc)

                    # Convert callback_time string to datetime object
                    if callback_time_str:
                        try:
                            callback_time = datetime.fromisoformat(
                                callback_time_str.replace('Z', '+00:00'))
                        except Exception as e:
                            logger.error(f"❌ Error parsing callback_time: {e}")
                            callback_time = None

                logger.info(
                    f"📝 Sending transcript complete webhook with {len(call_transcript)} items"
                )

                # Calculate call costs
                cost_breakdown_dict = None
                try:
                    calculator = CostCalculator()

                    # Count TTS characters (all bot messages)
                    tts_chars = sum(
                        len(item['text']) for item in call_transcript
                        if item['sender'] == 'bot')

                    # Determine calling provider (voxsun or twilio)
                    calling_provider = "voxsun"  # Default to voxsun
                    trunk_id = call_config.livekit_sip_trunk_id if hasattr(
                        call_config, 'livekit_sip_trunk_id') else ""
                    if "twilio" in trunk_id.lower():
                        calling_provider = "twilio"

                    # Calculate total cost
                    cost_breakdown = calculator.calculate_total_cost(
                        call_duration_seconds=duration_seconds,
                        tts_provider=call_config.tts.provider_name,
                        tts_model_id=call_config.tts.model_id,
                        stt_provider=call_config.stt.provider_name,
                        stt_model=call_config.stt.model,
                        llm_model=call_config.model.name,
                        calling_provider=calling_provider)

                    # Override TTS chars with actual count from transcript
                    calculator.tts_chars_sent = tts_chars
                    cost_breakdown.tts_cost = calculator.calculate_tts_cost(
                        tts_chars, call_config.tts.provider_name,
                        call_config.tts.model_id)
                    cost_breakdown.total_cost = (
                        cost_breakdown.calling_provider_cost +
                        cost_breakdown.tts_cost + cost_breakdown.stt_cost +
                        cost_breakdown.llm_cost)

                    cost_breakdown_dict = cost_breakdown.to_dict()
                    logger.info(
                        f"💰 Call cost calculated: ${cost_breakdown.total_cost:.4f}"
                    )

                except Exception as e:
                    logger.error(f"❌ Error calculating costs: {e}")
                    import traceback
                    logger.error(traceback.format_exc())

                await webhook_sender.send_transcript_complete(
                    call_config.webhook_url,
                    call_id,
                    full_transcript,
                    recording_urls,
                    user_tags_found=user_tags_found,
                    system_tags_found=system_tags_found,
                    callback_requested=callback_requested,
                    callback_time=callback_time,
                    cost_breakdown=cost_breakdown_dict)
            except Exception as e:
                logger.error(f"Error sending transcript complete webhook: {e}")

    # Register shutdown callback to send webhooks before process exits
    ctx.add_shutdown_callback(handle_disconnect)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ), )
