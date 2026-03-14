"""
Centralized message translations for all supported languages.

To add a new language:
  1. Add the language code to SUPPORTED_LANGUAGES.
  2. Add the corresponding entry to every dict in MESSAGES below.

Keys are grouped by feature so they're easy to find.
"""

SUPPORTED_LANGUAGES = ("en", "es", "fr", "hi", "ar")

# ---------------------------------------------------------------------------
# All translatable strings used across the application.
# Each key maps to {language_code: translated_string}.
# Use Python `.format()` placeholders for dynamic values.
# ---------------------------------------------------------------------------

MESSAGES: dict[str, dict[str, str]] = {

    # ── Call transfer ─────────────────────────────────────────────────────
    "transfer_hold": {
        "en": "Transferring you to our support team. Please hold.",
        "es": "Transfiriendo tu llamada a nuestro equipo de soporte. Por favor espera.",
        "fr": "Transfert de votre appel à notre équipe d'assistance. Veuillez patienter.",
        "hi": "आपकी कॉल को हमारी सहायता टीम को स्थानांतरित किया जा रहा है। कृपया प्रतीक्षा करें।",
        "ar": "جارٍ تحويل مكالمتك إلى فريق الدعم لدينا. يرجى الانتظار.",
    },
    "transfer_error": {
        "en": "I'm sorry, I couldn't complete the transfer. Let me continue helping you.",
        "es": "Lo siento, no pude completar la transferencia. Déjame continuar ayudándote.",
        "fr": "Désolé, je n'ai pas pu effectuer le transfert. Laissez-moi continuer à vous aider.",
        "hi": "क्षमा करें, मैं स्थानांतरण पूरा नहीं कर सका। मैं आपकी सहायता जारी रखता हूं।",
        "ar": "آسف، لم أتمكن من إكمال التحويل. دعني أواصل مساعدتك.",
    },
    "transfer_confirmation": {
        "en": "Transferring to human agent...",
        "es": "Transfiriendo al agente humano...",
        "fr": "Transfert vers un agent humain...",
        "hi": "मानव एजेंट को स्थानांतरित किया जा रहा है...",
        "ar": "جارٍ التحويل إلى وكيل بشري...",
    },
    "transfer_unavailable": {
        "en": "Transfer not available at this moment",
        "es": "Transferencia no disponible en este momento",
        "fr": "Transfert non disponible pour le moment",
        "hi": "स्थानांतरण इस समय उपलब्ध नहीं है",
        "ar": "التحويل غير متاح في الوقت الحالي",
    },

    # ── End call / goodbye ────────────────────────────────────────────────
    "goodbye": {
        "en": "Understood. Thank you for your time. Goodbye!",
        "es": "Entendido. Gracias por tu tiempo. ¡Adiós!",
        "fr": "Compris. Merci pour votre temps. Au revoir !",
        "hi": "समझ गया। आपके समय के लिए धन्यवाद। अलविदा!",
        "ar": "مفهوم. شكراً لوقتك. وداعاً!",
    },

    # ── Voicemail defaults ────────────────────────────────────────────────
    "voicemail_default": {
        "en": "Hi, call me back when you reach this message.",
        "es": "Hola, devuélveme la llamada cuando recibas este mensaje.",
        "fr": "Bonjour, rappelez-moi quand vous recevrez ce message.",
        "hi": "नमस्ते, जब आपको यह संदेश मिले तो मुझे वापस कॉल करें।",
        "ar": "مرحباً، اتصل بي عندما تتلقى هذه الرسالة.",
    },

    # ── Context section headers ───────────────────────────────────────────
    "context_header": {
        "en": "\n**CURRENT DATE & TIME:**\n",
        "es": "\n**FECHA Y HORA ACTUAL:**\n",
        "fr": "\n**DATE ET HEURE ACTUELLES:**\n",
        "hi": "\n**वर्तमान तारीख और समय:**\n",
        "ar": "\n**التاريخ والوقت الحالي:**\n",
    },
    "context_date": {
        "en": "- Today's date: {date}\n",
        "es": "- Fecha de hoy: {date}\n",
        "fr": "- Date d'aujourd'hui: {date}\n",
        "hi": "- आज की तारीख: {date}\n",
        "ar": "- تاريخ اليوم: {date}\n",
    },
    "context_time": {
        "en": "- Current time: {time}\n",
        "es": "- Hora actual: {time}\n",
        "fr": "- Heure actuelle: {time}\n",
        "hi": "- वर्तमान समय: {time}\n",
        "ar": "- الوقت الحالي: {time}\n",
    },

    # ── Previous call history ─────────────────────────────────────────────
    "previous_call_header": {
        "en": "\n**PREVIOUS CALL HISTORY:**\nYou have spoken with {name} before. Here's the conversation history:\n\n{summary}\n\nIMPORTANT: Reference this history naturally in the conversation. If they mentioned something before, acknowledge it. If they said \"not interested\" previously, be respectful and brief. Build continuity - don't repeat what was already discussed.\n",
        "es": "\n**HISTORIAL DE LLAMADAS ANTERIORES:**\nHas hablado con {name} antes. Aquí está el historial de conversación:\n\n{summary}\n\nIMPORTANTE: Haz referencia a este historial de forma natural en la conversación. Si mencionaron algo antes, reconócelo. Si dijeron \"no interesado\" anteriormente, sé respetuoso y breve. Construye continuidad - no repitas lo que ya se discutió.\n",
        "fr": "\n**HISTORIQUE DES APPELS PRÉCÉDENTS:**\nVous avez déjà parlé avec {name}. Voici l'historique de la conversation:\n\n{summary}\n\nIMPORTANT: Référencez cet historique naturellement dans la conversation. S'ils ont mentionné quelque chose avant, reconnaissez-le. S'ils ont dit \"pas intéressé\" précédemment, soyez respectueux et bref. Créez de la continuité - ne répétez pas ce qui a déjà été discuté.\n",
        "hi": "\n**पिछले कॉल का इतिहास:**\nआप {name} से पहले बात कर चुके हैं। यहाँ बातचीत का इतिहास है:\n\n{summary}\n\nमहत्वपूर्ण: इस इतिहास को बातचीत में स्वाभाविक रूप से संदर्भित करें। यदि उन्होंने पहले कुछ उल्लेख किया था, तो उसे स्वीकार करें। यदि उन्होंने पहले \"इच्छुक नहीं\" कहा था, तो सम्मानपूर्ण और संक्षिप्त रहें। निरंतरता बनाएं - जो पहले से चर्चा हो चुकी है उसे दोहराएं नहीं।\n",
        "ar": "\n**سجل المكالمات السابقة:**\nلقد تحدثت مع {name} من قبل. إليك سجل المحادثة:\n\n{summary}\n\nمهم: اشر إلى هذا السجل بشكل طبيعي في المحادثة. إذا ذكروا شيئاً من قبل، فاعترف به. إذا قالوا \"غير مهتم\" سابقاً، كن محترماً ومختصراً. بناء الاستمرارية - لا تكرر ما تم مناقشته بالفعل.\n",
    },

    # ── Voicemail detection instructions ──────────────────────────────────
    "voicemail_instructions": {
        "en": """

**VOICEMAIL DETECTION (CRITICAL):**
Listen carefully to the initial response when the call connects.
If you detect ANY of these signs of voicemail/answering machine:
- Phrases like "leave a message", "at the tone", "not available", "can't come to the phone"
- Beep sounds
- Automated greeting messages
- No human response after 3 seconds

IMMEDIATELY call the detected_answering_machine function.
After calling it, say the voicemail message EXACTLY as instructed, then end the call politely.
""",
        "es": """

**DETECCIÓN DE BUZÓN DE VOZ (CRÍTICO):**
Escucha atentamente la respuesta inicial cuando se conecte la llamada.
Si detectas CUALQUIERA de estas señales de buzón de voz/contestador automático:
- Frases como "deja un mensaje", "después del tono", "no disponible", "no puede atender"
- Sonidos de pitido
- Mensajes de bienvenida automatizados
- Sin respuesta humana después de 3 segundos

Llama INMEDIATAMENTE a la función detected_answering_machine.
Después de llamarla, di el mensaje de buzón de voz EXACTAMENTE como se indica, luego termina la llamada cortésmente.
""",
        "fr": """

**DÉTECTION DE MESSAGERIE VOCALE (CRITIQUE):**
Écoutez attentivement la réponse initiale lorsque l'appel se connecte.
Si vous détectez L'UN de ces signes de messagerie vocale/répondeur automatique:
- Des phrases comme "laisser un message", "après le bip", "non disponible", "ne peut pas répondre"
- Sons de bip
- Messages d'accueil automatisés
- Aucune réponse humaine après 3 secondes

Appelez IMMÉDIATEMENT la fonction detected_answering_machine.
Après l'avoir appelée, dites le message vocal EXACTEMENT comme indiqué, puis terminez l'appel poliment.
""",
        "hi": """

**वॉइसमेल डिटेक्शन (महत्वपूर्ण):**
कॉल कनेक्ट होने पर प्रारंभिक प्रतिक्रिया को ध्यान से सुनें।
यदि आप वॉइसमेल/उत्तर देने वाली मशीन के इनमें से किसी भी संकेत का पता लगाते हैं:
- "संदेश छोड़ें", "टोन के बाद", "उपलब्ध नहीं" जैसे वाक्यांश
- बीप की आवाज़
- स्वचालित स्वागत संदेश
- 3 सेकंड के बाद कोई मानवीय प्रतिक्रिया नहीं

तुरंत detected_answering_machine फ़ंक्शन को कॉल करें।
इसे कॉल करने के बाद, वॉइसमेल संदेश को बिल्कुल वैसे ही कहें जैसा निर्देश दिया गया है, फिर कॉल को विनम्रता से समाप्त करें।
""",
        "ar": """

**كشف البريد الصوتي (حاسم):**
استمع بعناية إلى الرد الأولي عندما يتصل المكالمة.
إذا اكتشفت أياً من هذه العلامات للبريد الصوتي/جهاز الرد الآلي:
- عبارات مثل "اترك رسالة"، "بعد النغمة"، "غير متاح"، "لا يمكن الرد على الهاتف"
- أصوات صفير
- رسائل ترحيب آلية
- لا رد بشري بعد 3 ثوان

اتصل فوراً بوظيفة detected_answering_machine.
بعد الاتصال بها، قل رسالة البريد الصوتي تماماً كما هو موضح، ثم أنهِ المكالمة بأدب.
""",
    },

    # ── Full prompt wrapper ───────────────────────────────────────────────
    "prompt_wrapper": {
        "en": """
I am an agent. Follow these instructions every time you speak:

- Customer's first name is: {customer_name} (Use the first name occasionally during conversation, NOT in every sentence)
{context_info}
**BASE AGENT PROMPT INSTRUCTIONS:**
{base_prompt}

**SPECIFIC AGENT INSTRUCTIONS FOR THIS CALL:**
{agent_instructions}
{previous_call_context}
{voicemail_instructions}
""",
        "es": """
Soy un agente. Sigue estas instrucciones cada vez que hables:

- El nombre del cliente es: {customer_name} (Usa el primer nombre ocasionalmente durante la conversación, NO en cada oración)
{context_info}
**INSTRUCCIONES BASE DEL AGENTE:**
{base_prompt}

**INSTRUCCIONES ESPECÍFICAS DEL AGENTE PARA ESTA LLAMADA:**
{agent_instructions}
{previous_call_context}
{voicemail_instructions}
""",
        "fr": """
Je suis un agent. Suivez ces instructions chaque fois que vous parlez:

- Le prénom du client est: {customer_name} (Utilisez le prénom occasionnellement pendant la conversation, PAS dans chaque phrase)
{context_info}
**INSTRUCTIONS DE BASE DE L'AGENT:**
{base_prompt}

**INSTRUCTIONS SPÉCIFIQUES DE L'AGENT POUR CET APPEL:**
{agent_instructions}
{previous_call_context}
{voicemail_instructions}
""",
        "hi": """
मैं एक एजेंट हूं। हर बार बोलते समय इन निर्देशों का पालन करें:

- ग्राहक का पहला नाम है: {customer_name} (बातचीत के दौरान कभी-कभार पहले नाम का उपयोग करें, हर वाक्य में नहीं)
{context_info}
**एजेंट के बुनियादी निर्देश:**
{base_prompt}

**इस कॉल के लिए विशिष्ट एजेंट निर्देश:**
{agent_instructions}
{previous_call_context}
{voicemail_instructions}
""",
        "ar": """
أنا وكيل. اتبع هذه التعليمات في كل مرة تتحدث فيها:

- اسم العميل الأول هو: {customer_name} (استخدم الاسم الأول أحياناً أثناء المحادثة، وليس في كل جملة)
{context_info}
**تعليمات الوكيل الأساسية:**
{base_prompt}

**تعليمات الوكيل المحددة لهذه المكالمة:**
{agent_instructions}
{previous_call_context}
{voicemail_instructions}
""",
    },
}
