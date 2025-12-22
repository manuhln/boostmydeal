from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class TTSConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    provider_name: str = Field(..., description="TTS provider: 'eleven_labs', 'openai', or 'smallest_ai'")
    voice_id: str = Field(..., description="Voice ID for the TTS provider")
    model_id: str = Field(default="", description="Model ID for TTS (optional, e.g., 'waves-v2' for Smallest.ai)")
    api_key: str = Field(..., description="API key for TTS provider")


class STTConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    provider_name: str = Field(..., description="STT provider: 'deepgram' or 'openai'")
    model: str = Field(default="nova-2", description="STT model to use (e.g., 'nova-2' for Deepgram, 'gpt-4o-mini-transcribe' for OpenAI)")
    api_key: str = Field(..., description="API key for STT provider")


class ModelConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    name: str = Field(default="gpt-4o-mini", description="LLM model name")
    api_key: str = Field(..., description="API key for LLM provider")


class CallConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    to_phone: str = Field(..., description="Destination phone number in E.164 format")
    from_phone: str = Field(..., description="Twilio phone number in E.164 format")
    twilio_account_sid: str = Field(..., description="Twilio account SID")
    twilio_auth_token: str = Field(..., description="Twilio auth token")
    contact_name: str = Field(..., description="Name of the person being called")
    agent_initial_message: str = Field(..., description="Initial message from agent")
    user_speak_first: bool = Field(default=True, description="If true, user speaks first")
    agent_prompt_preamble: str = Field(..., description="System prompt for the agent")
    agent_generate_responses: bool = Field(default=True, description="Enable agent responses")
    tts: TTSConfig = Field(..., description="Text-to-speech configuration")
    stt: STTConfig = Field(..., description="Speech-to-text configuration")
    model: ModelConfig = Field(..., description="LLM model configuration")
    voicemail: bool = Field(default=False, description="Enable voicemail detection")
    voicemail_message: Optional[str] = Field(None, description="Message to leave on voicemail")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="LLM temperature")
    language: str = Field(default="en", description="Language code (e.g., 'en', 'es')")
    agent_speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Agent speaking speed")
    webhook_url: Optional[str] = Field(None, description="URL to send webhook events (optional)")
    use_knowledge_base: bool = Field(default=True, description="Enable Pinecone knowledge base for RAG")
    knowledge_base_top_k: int = Field(default=3, ge=1, le=10, description="Number of knowledge base results to retrieve")
    recording: bool = Field(default=False, description="Enable call recording with GCS upload")
    recording_expiration_days: int = Field(default=30, ge=1, le=365, description="Recording URL expiration in days")
    previous_call_summary: Optional[str] = Field(None, description="Summary of previous call history with this customer for conversation continuity")
    current_date: Optional[str] = Field(None, description="Current date (e.g., 'Monday, November 3, 2025')")
    current_time: Optional[str] = Field(None, description="Current time (e.g., '02:36:37 PM')")
    enable_call_transfer: bool = Field(default=False, description="Enable call transfer to human agent")
    transfer_phone_number: Optional[str] = Field(None, description="Phone number to transfer call to (E.164 format, e.g., '+1234567890')")
    user_tags: list[str] = Field(default_factory=list, description="User-defined tags to detect in conversation (e.g., ['follow up', 'schedule meet'])")
    system_tags: list[str] = Field(default_factory=list, description="System-defined tags to detect in conversation (e.g., ['interested if call more than 1 minute'])")
    livekit_sip_trunk_id: str = Field(..., description="LiveKit SIP trunk ID for making outbound calls")
    keyboard_sound: bool = Field(default=False, description="Enable keyboard typing sound effects when agent notes user data")
