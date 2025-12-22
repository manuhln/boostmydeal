# Multi-Language Support

## Overview

The LiveKit Agent supports multiple languages for voice interactions, allowing you to conduct calls in English, Spanish, or French. All agent prompts, instructions, and system messages automatically adapt to the selected language.

## Supported Languages

- **English** (`"en"`) - Default language
- **Spanish** (`"es"`) - Español
- **French** (`"fr"`) - Français

## Configuration

Simply include the `language` parameter in your API request:

```json
{
  "language": "en",
  ...other configuration...
}
```

### Language Codes

- `"en"` - English
- `"es"` - Spanish (Español)
- `"fr"` - French (Français)

## What Gets Translated

### 1. Base Agent Prompts
The core agent instructions are provided in the selected language:

**English:**
```
You are an AI agent. Follow these instructions every time you speak:
- Be professional, friendly, and concise
- Listen carefully to the customer's needs
- Provide clear and helpful responses
- Keep conversations natural and engaging
```

**Spanish:**
```
Eres un agente de IA. Sigue estas instrucciones cada vez que hables:
- Sé profesional, amigable y conciso
- Escucha atentamente las necesidades del cliente
- Proporciona respuestas claras y útiles
- Mantén las conversaciones naturales y atractivas
```

**French:**
```
Vous êtes un agent IA. Suivez ces instructions chaque fois que vous parlez:
- Soyez professionnel, amical et concis
- Écoutez attentivement les besoins du client
- Fournissez des réponses claires et utiles
- Gardez les conversations naturelles et engageantes
```

### 2. System Messages

All system-level messages adapt to the language:

#### Date & Time Context
- **EN:** "Today's date: ...", "Current time: ..."
- **ES:** "Fecha de hoy: ...", "Hora actual: ..."
- **FR:** "Date d'aujourd'hui: ...", "Heure actuelle: ..."

#### Previous Call History
- **EN:** "PREVIOUS CALL HISTORY: You have spoken with..."
- **ES:** "HISTORIAL DE LLAMADAS ANTERIORES: Has hablado con..."
- **FR:** "HISTORIQUE DES APPELS PRÉCÉDENTS: Vous avez déjà parlé avec..."

#### Voicemail Detection
- **EN:** "VOICEMAIL DETECTION (CRITICAL): Listen carefully..."
- **ES:** "DETECCIÓN DE BUZÓN DE VOZ (CRÍTICO): Escucha atentamente..."
- **FR:** "DÉTECTION DE MESSAGERIE VOCALE (CRITIQUE): Écoutez attentivement..."

### 3. Call Transfer Messages

When transferring calls to human agents:

- **EN:** "Transferring you to our support team. Please hold."
- **ES:** "Transfiriendo tu llamada a nuestro equipo de soporte. Por favor espera."
- **FR:** "Transfert de votre appel à notre équipe d'assistance. Veuillez patienter."

Error messages also adapt:
- **EN:** "I'm sorry, I couldn't complete the transfer. Let me continue helping you."
- **ES:** "Lo siento, no pude completar la transferencia. Déjame continuar ayudándote."
- **FR:** "Désolé, je n'ai pas pu effectuer le transfert. Laissez-moi continuer à vous aider."

### 4. STT (Speech-to-Text) Configuration

The language parameter is automatically passed to the STT provider for accurate transcription:

```python
# Deepgram
stt_instance = deepgram.STT(
    model=call_config.stt.model,
    api_key=call_config.stt.api_key,
    language=call_config.language,  # "en", "es", or "fr"
)

# OpenAI Whisper
stt_instance = openai.STT(
    model=whisper_model,
    language=call_config.language,  # "en", "es", or "fr"
)
```

## Example API Request

### English Call
```bash
curl -X POST "https://your-api.com/call" \
  -H "Content-Type: application/json" \
  -d '{
    "to_phone": "+19876543210",
    "from_phone": "+11234567890",
    "contact_name": "John Doe",
    "language": "en",
    "agent_initial_message": "Hi {contact_name}, this is Sarah from support!",
    "agent_prompt_preamble": "You are a helpful customer support agent.",
    ...
  }'
```

### Spanish Call
```bash
curl -X POST "https://your-api.com/call" \
  -H "Content-Type: application/json" \
  -d '{
    "to_phone": "+525512345678",
    "from_phone": "+11234567890",
    "contact_name": "María García",
    "language": "es",
    "agent_initial_message": "Hola {contact_name}, soy Sara del equipo de soporte!",
    "agent_prompt_preamble": "Eres un agente de soporte al cliente útil.",
    ...
  }'
```

### French Call
```bash
curl -X POST "https://your-api.com/call" \
  -H "Content-Type: application/json" \
  -d '{
    "to_phone": "+33123456789",
    "from_phone": "+11234567890",
    "contact_name": "Pierre Dubois",
    "language": "fr",
    "agent_initial_message": "Bonjour {contact_name}, je suis Sarah de l'équipe d'assistance!",
    "agent_prompt_preamble": "Vous êtes un agent de support client serviable.",
    ...
  }'
```

## Automatic Fallback

If an unsupported language code is provided (e.g., `"de"`, `"it"`, `"zh"`), the system automatically falls back to English:

- **Prompts:** All agent instructions use English templates
- **STT:** Speech recognition is configured for English
- **Messages:** All system messages (transfer, voicemail, etc.) use English
- **Logging:** A warning is logged: `"Unsupported language 'xx', falling back to English"`
- **No Errors:** The call continues normally without throwing exceptions

Example:
```json
{
  "language": "de"  // Unsupported German code
  // System automatically uses English instead
}
```

## Best Practices

1. **Match TTS Voice to Language**
   - Use Spanish voices for Spanish calls
   - Use French voices for French calls
   - Ensure natural pronunciation

2. **Localize Custom Prompts**
   - Translate `agent_prompt_preamble` to match the language
   - Translate `agent_initial_message` appropriately

3. **Date/Time Formatting**
   - Consider local date formats when providing `current_date`
   - Use 12-hour or 24-hour time based on regional preferences

4. **Test with Supported Languages**
   - Use `"en"`, `"es"`, or `"fr"` for best results
   - Unsupported languages fall back to English automatically

## Logging

The system logs which language is being used:
```
Agent initialized for customer: John, language: en
Agent initialized for customer: María, language: es
Agent initialized for customer: Pierre, language: fr
```

## Technical Details

### Implementation
- Language detection happens at agent initialization
- All prompts are dynamically constructed based on the language
- Language parameter is passed through to STT providers
- Transfer and error messages adapt automatically

### Language Selection
```python
language = call_config.language.lower()  # Normalize to lowercase
base_prompt = BASE_AGENT_PROMPTS.get(language, BASE_AGENT_PROMPTS["en"])
```

If an unsupported language is provided, the system defaults to English without errors.

## Adding New Languages

To add support for additional languages:

1. Add base prompt translation to `BASE_AGENT_PROMPTS` dictionary
2. Add language-specific sections for:
   - Date/time context
   - Previous call history
   - Voicemail instructions
   - Transfer messages
3. Update this documentation

## Known Limitations

- Currently supports English, Spanish, and French only
- Custom `agent_prompt_preamble` must be manually translated
- LLM responses depend on the model's language capabilities
