
"""
SSML Agent Wrapper for proper pronunciation of special characters
"""
import re
from typing import AsyncGenerator, Optional
from vocode.streaming.agent.chat_gpt_agent import ChatGPTAgent
from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.message import BaseMessage, SSMLMessage
from vocode.streaming.agent.base_agent import GeneratedResponse, StreamedResponse
from loguru import logger


class SSMLChatGPTAgent(ChatGPTAgent):
    """
    Custom ChatGPT Agent that adds SSML tags for proper pronunciation.
    
    This wrapper automatically converts special characters to SSML format:
    - @ becomes "at" / "arobase" / "arroba" (language-specific)
    - . becomes "dot" / "point" / "punto" (in email addresses)
    - Prices are converted to proper spoken format
    """
    
    def __init__(self, agent_config: ChatGPTAgentConfig, language: str = "en", **kwargs):
        """Initialize the SSML agent wrapper."""
        super().__init__(agent_config=agent_config, **kwargs)
        self.language = language.lower()
        logger.info(f"🎤 SSML Agent initialized for language: {self.language}")
    
    def add_ssml_pronunciation(self, text: str) -> str:
        """
        Convert text to SSML with proper pronunciation for special characters.
        Language-aware transformations for English, French, and Spanish.
        
        Args:
            text: Original text from the agent
            
        Returns:
            Text with SSML tags for special characters
        """
        if not text:
            return text
        
        # Remove asterisks completely (don't speak them)
        text = text.replace("*", "")
        
        # Language-specific transformations
        if self.language == "fr":
            # French-specific transformations
            # Convert prices BEFORE converting dots - handle both comma and dot as decimal separator
            # Pattern for 0.XX or 0,XX euros/dollars
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:euros?|€)\b', 
                          lambda m: f"{int(m.group(1))} centimes", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} centimes", text)
            text = re.sub(r'\b0[.,](\d{1,2})\s*€', 
                          lambda m: f"{int(m.group(1))} centimes", text)
            
            # Handle larger euro amounts (e.g., 100 euros, 50€)
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} centimes" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} centimes" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text)
            text = re.sub(r'\b(\d+)\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            
            # Handle dollars for French
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:dollars?|\$)\b', 
                          lambda m: f"{int(m.group(1))} cents", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} cents", text)
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:dollars?|\$)\b',
                          lambda m: f"{m.group(1)} dollars {int(m.group(2))} cents" if int(m.group(2)) > 0 else f"{m.group(1)} dollars", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} dollars {int(m.group(2))} cents" if int(m.group(2)) > 0 else f"{m.group(1)} dollars", text)
            
            # Replace @ with "arobase" (French term for @)
            text = text.replace("@", " arobase ")
            
            # Replace dots in technical contexts with "point"
            def replace_dot_fr(match):
                return f"{match.group(1)} point {match.group(2)}"
            
            text = re.sub(r'([a-zA-Z0-9])[.,]([a-zA-Z0-9])', replace_dot_fr, text)
            text = text.replace("...", " point point point ")
            
        elif self.language == "es":
            # Spanish-specific transformations
            # Convert prices BEFORE converting dots - handle both comma and dot as decimal separator
            # Pattern for 0.XX or 0,XX euros/dollars
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:euros?|€)\b', 
                          lambda m: f"{int(m.group(1))} céntimos", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} céntimos", text)
            text = re.sub(r'\b0[.,](\d{1,2})\s*€', 
                          lambda m: f"{int(m.group(1))} céntimos", text)
            
            # Handle larger euro amounts (e.g., 100 euros, 50€)
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} céntimos" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} céntimos" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text)
            text = re.sub(r'\b(\d+)\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            
            # Handle dollars for Spanish
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:dólares?|\$)\b', 
                          lambda m: f"{int(m.group(1))} centavos", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} centavos", text)
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:dólares?|\$)\b',
                          lambda m: f"{m.group(1)} dólares {int(m.group(2))} centavos" if int(m.group(2)) > 0 else f"{m.group(1)} dólares", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} dólares {int(m.group(2))} centavos" if int(m.group(2)) > 0 else f"{m.group(1)} dólares", text)
            
            # Replace @ with "arroba" (Spanish term for @)
            text = text.replace("@", " arroba ")
            
            # Replace dots in technical contexts with "punto"
            def replace_dot_es(match):
                return f"{match.group(1)} punto {match.group(2)}"
            
            text = re.sub(r'([a-zA-Z0-9])[.,]([a-zA-Z0-9])', replace_dot_es, text)
            text = text.replace("...", " punto punto punto ")
            
        else:
            # English (default) transformations
            # Convert prices BEFORE converting dots
            text = re.sub(r'\b0\.(\d{1,2})\s*(?:dollars?)\b', 
                          lambda m: f"{int(m.group(1))} cents", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*0\.(\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} cents", text)
            text = re.sub(r'\b0\.(\d{1,2})\s*\$', 
                          lambda m: f"{int(m.group(1))} cents", text)
            
            # Replace @ with "at"
            text = text.replace("@", " at ")
            
            # Replace dots in technical contexts
            def replace_dot_in_technical_context(match):
                return f"{match.group(1)} dot {match.group(2)}"
            
            text = re.sub(r'([a-zA-Z0-9])\.([a-zA-Z0-9])', replace_dot_in_technical_context, text)
            text = text.replace("...", " dot dot dot ")
        
        # Clean up any double spaces (common to all languages)
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    def wrap_in_ssml(self, text: str) -> str:
        """
        Wrap the entire text in SSML speak tags if needed.
        
        Args:
            text: Text to wrap
            
        Returns:
            SSML formatted text
        """
        # If text already has SSML tags, don't wrap again
        if text.startswith("<speak>"):
            return text
        
        # For ElevenLabs, we can use simple text replacements
        # since optimize_streaming_latency handles SSML processing
        return self.add_ssml_pronunciation(text)
    
    async def generate_response(
        self,
        human_input: str,
        conversation_id: str,
        is_interrupt: bool = False,
        bot_was_in_medias_res: bool = False,
    ) -> AsyncGenerator[GeneratedResponse, None]:
        """
        Generate response with SSML processing for special characters.
        
        This method intercepts the original response and adds SSML tags.
        """
        # Call the parent's generate_response method
        async for response in super().generate_response(
            human_input=human_input,
            conversation_id=conversation_id,
            is_interrupt=is_interrupt,
            bot_was_in_medias_res=bot_was_in_medias_res,
        ):
            # Process BaseMessage responses to add SSML
            if isinstance(response.message, BaseMessage):
                original_text = response.message.text
                processed_text = self.wrap_in_ssml(original_text)
                
                # Log if we made changes
                if original_text != processed_text:
                    logger.debug(f"🎤 SSML [{self.language}]: '{original_text[:50]}...' → '{processed_text[:50]}...'")
                
                # Update the message with processed text
                response.message.text = processed_text
            
            yield response
