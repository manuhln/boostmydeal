import httpx
import logging
import asyncio
from typing import Dict, Any, Tuple, Optional
import json
import base64

logger = logging.getLogger(__name__)

class CredentialValidator:
    """Validates API credentials by making actual API requests"""
    
    def __init__(self):
        self.timeout = 10.0  # 10 second timeout for validation requests
    
    async def validate_elevenlabs_credentials(self, api_key: str) -> Tuple[bool, str]:
        """Validate ElevenLabs API key by fetching user info"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Accept": "application/json",
                    "xi-api-key": api_key
                }
                
                response = await client.get(
                    "https://api.elevenlabs.io/v1/user",
                    headers=headers
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    char_count = user_data.get("subscription", {}).get("character_count", 0)
                    char_limit = user_data.get("subscription", {}).get("character_limit", 0)
                    logger.info(f"✅ ElevenLabs API valid - Characters: {char_count}/{char_limit}")
                    return True, "ElevenLabs API key is valid"
                elif response.status_code == 401:
                    return False, "ElevenLabs API key is invalid or expired"
                else:
                    return False, f"ElevenLabs API error: {response.status_code}"
                    
        except httpx.TimeoutException:
            return False, "ElevenLabs API request timed out"
        except Exception as e:
            logger.error(f"ElevenLabs validation error: {e}")
            return False, f"ElevenLabs validation failed: {str(e)}"
    
    async def validate_deepgram_credentials(self, api_key: str) -> Tuple[bool, str]:
        """Validate Deepgram API key by fetching projects"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Authorization": f"Token {api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    "https://api.deepgram.com/v1/projects",
                    headers=headers
                )
                
                if response.status_code == 200:
                    projects = response.json()
                    project_count = len(projects.get("projects", []))
                    logger.info(f"✅ Deepgram API valid - Projects: {project_count}")
                    return True, "Deepgram API key is valid"
                elif response.status_code == 401:
                    return False, "Deepgram API key is invalid or expired"
                else:
                    return False, f"Deepgram API error: {response.status_code}"
                    
        except httpx.TimeoutException:
            return False, "Deepgram API request timed out"
        except Exception as e:
            logger.error(f"Deepgram validation error: {e}")
            return False, f"Deepgram validation failed: {str(e)}"
    
    async def validate_twilio_credentials(self, account_sid: str, auth_token: str) -> Tuple[bool, str]:
        """Validate Twilio credentials by fetching account info"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Encode credentials for Basic Auth
                credentials = f"{account_sid}:{auth_token}"
                encoded_credentials = base64.b64encode(credentials.encode()).decode()
                
                headers = {
                    "Authorization": f"Basic {encoded_credentials}",
                    "Accept": "application/json"
                }
                
                response = await client.get(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                    headers=headers
                )
                
                if response.status_code == 200:
                    account_data = response.json()
                    account_status = account_data.get("status", "unknown")
                    friendly_name = account_data.get("friendly_name", "N/A")
                    logger.info(f"✅ Twilio API valid - Account: {friendly_name} (Status: {account_status})")
                    return True, "Twilio credentials are valid"
                elif response.status_code == 401:
                    return False, "Twilio credentials are invalid"
                elif response.status_code == 403:
                    return False, "Twilio account access forbidden"
                else:
                    return False, f"Twilio API error: {response.status_code}"
                    
        except httpx.TimeoutException:
            return False, "Twilio API request timed out"
        except Exception as e:
            logger.error(f"Twilio validation error: {e}")
            return False, f"Twilio validation failed: {str(e)}"
    
    async def validate_openai_credentials(self, api_key: str) -> Tuple[bool, str]:
        """Validate OpenAI API key by making a simple models request"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers=headers
                )
                
                if response.status_code == 200:
                    models_data = response.json()
                    model_count = len(models_data.get("data", []))
                    logger.info(f"✅ OpenAI API valid - Models available: {model_count}")
                    return True, "OpenAI API key is valid"
                elif response.status_code == 401:
                    return False, "OpenAI API key is invalid or expired"
                else:
                    return False, f"OpenAI API error: {response.status_code}"
                    
        except httpx.TimeoutException:
            return False, "OpenAI API request timed out"
        except Exception as e:
            logger.error(f"OpenAI validation error: {e}")
            return False, f"OpenAI validation failed: {str(e)}"
    
    async def validate_all_credentials(self, data: Dict[str, Any]) -> Tuple[bool, Dict[str, str]]:
        """
        Validate all API credentials based on the JSON payload
        Returns: (all_valid, validation_results)
        """
        validation_results = {}
        validation_tasks = []
        
        # Extract provider information (default to twilio for backward compatibility)
        provider = data.get("provider", "twilio").lower()
        
        # Extract credentials from payload
        twilio_account_sid = data.get("twilio_account_sid")
        twilio_auth_token = data.get("twilio_auth_token")
        
        # Support both direct and nested TTS provider specification
        tts_config = data.get("tts", {})
        tts_provider = (
            data.get("tts_provider") or 
            tts_config.get("provider") or 
            tts_config.get("provider_name", "")
        ).lower()
        
        # Get API keys from environment or payload (supporting both direct and nested configs)
        import os
        elevenlabs_api_key = (
            data.get("elevenlabs_api_key") or 
            tts_config.get("api_key") or 
            os.getenv("ELEVENLABS_API_KEY")
        )
        
        stt_config = data.get("stt", {})
        deepgram_api_key = (
            data.get("deepgram_api_key") or 
            stt_config.get("api_key") or 
            os.getenv("DEEPGRAM_API_KEY")
        )
        
        model_config = data.get("model", {})
        openai_api_key = (
            data.get("openai_api_key") or 
            model_config.get("api_key") or 
            os.getenv("OPENAI_API_KEY")
        )
        
        # Validate Twilio credentials ONLY if provider is twilio
        if provider == "twilio":
            if twilio_account_sid and twilio_auth_token:
                validation_tasks.append(self._validate_twilio_task(twilio_account_sid, twilio_auth_token))
            else:
                validation_results["twilio"] = "Missing Twilio credentials (account_sid or auth_token)"
        else:
            # For non-Twilio providers (e.g., voxsun), skip Twilio validation
            logger.info(f"ℹ️ Provider is '{provider}', skipping Twilio credential validation")
            validation_results["twilio"] = f"Skipped (provider: {provider})"
        
        # Validate TTS provider credentials
        if tts_provider in ["eleven_labs", "elevenlabs"] and elevenlabs_api_key:
            validation_tasks.append(self._validate_elevenlabs_task(elevenlabs_api_key))
        elif tts_provider in ["eleven_labs", "elevenlabs"]:
            validation_results["elevenlabs"] = "Missing ElevenLabs API key"
        
        # Validate Deepgram (always required for STT)
        if deepgram_api_key:
            validation_tasks.append(self._validate_deepgram_task(deepgram_api_key))
        else:
            validation_results["deepgram"] = "Missing Deepgram API key"
        
        # Validate OpenAI (always required for LLM)
        if openai_api_key:
            validation_tasks.append(self._validate_openai_task(openai_api_key))
        else:
            validation_results["openai"] = "Missing OpenAI API key"
        
        # Run all validations concurrently
        if validation_tasks:
            task_results = await asyncio.gather(*validation_tasks, return_exceptions=True)
            
            for result in task_results:
                if isinstance(result, Exception):
                    logger.error(f"Validation task failed: {result}")
                    continue
                
                if isinstance(result, tuple) and len(result) == 3:
                    service, is_valid, message = result
                    validation_results[service] = message
                else:
                    logger.error(f"Invalid task result format: {result}")
                    continue
        
        # Check if all validations passed
        all_valid = all(
            not any(keyword in msg.lower() for keyword in [
                "missing", "invalid", "expired", "error", "failed", "timeout", "unauthorized", "forbidden"
            ])
            for msg in validation_results.values()
        )
        
        return all_valid, validation_results
    
    async def _validate_twilio_task(self, account_sid: str, auth_token: str):
        """Wrapper task for Twilio validation"""
        is_valid, message = await self.validate_twilio_credentials(account_sid, auth_token)
        return "twilio", is_valid, message
    
    async def _validate_elevenlabs_task(self, api_key: str):
        """Wrapper task for ElevenLabs validation"""
        is_valid, message = await self.validate_elevenlabs_credentials(api_key)
        return "elevenlabs", is_valid, message
    
    async def _validate_deepgram_task(self, api_key: str):
        """Wrapper task for Deepgram validation"""
        is_valid, message = await self.validate_deepgram_credentials(api_key)
        return "deepgram", is_valid, message
    
    async def _validate_openai_task(self, api_key: str):
        """Wrapper task for OpenAI validation"""
        is_valid, message = await self.validate_openai_credentials(api_key)
        return "openai", is_valid, message

# Global validator instance
validator = CredentialValidator()