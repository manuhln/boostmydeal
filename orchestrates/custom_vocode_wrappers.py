"""
Custom wrapper classes for Vocode package to implement RAG/Knowledge Base functionality.
These wrappers extend the base vocode classes without modifying the package directly.
"""

import uuid
from typing import Iterable, List, Optional, Tuple, Any, AsyncGenerator, Dict, Union

from langchain.docstore.document import Document
from loguru import logger
from pinecone import Pinecone
from openai import AsyncAzureOpenAI, AsyncOpenAI

from vocode import getenv
from vocode.streaming.models.vector_db import PineconeConfig
from vocode.streaming.vector_db.base_vector_db import VectorDB
from vocode.streaming.agent.chat_gpt_agent import ChatGPTAgent, ChatGPTAgentConfig
from vocode.streaming.action.abstract_factory import AbstractActionFactory
from vocode.streaming.action.default_factory import DefaultActionFactory
from vocode.streaming.agent.base_agent import GeneratedResponse, StreamedResponse
from vocode.streaming.agent.openai_utils import (
    format_openai_chat_messages_from_transcript,
    openai_get_tokens,
    vector_db_result_to_openai_chat_message,
)
from vocode.streaming.agent.streaming_utils import collate_response_async, stream_response_async
from vocode.streaming.models.message import BaseMessage, BotBackchannel, LLMToken
from vocode.streaming.models.events import Sender
from vocode.streaming.models.transcript import Message
from vocode.utils.sentry_utils import CustomSentrySpans, sentry_create_span
import sentry_sdk
from vocode import sentry_span_tags


class CustomPineconeDB(VectorDB):
    """
    Custom Pinecone DB wrapper with modern Pinecone SDK support (v3.x+).
    Extends VectorDB with enhanced logging and error handling.
    """
    
    def __init__(self, config: PineconeConfig, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.config = config

        self.index_name = self.config.index
        self.pinecone_api_key = getenv("PINECONE_API_KEY") or self.config.api_key
        
        # Initialize modern Pinecone client
        try:
            self.pc = Pinecone(api_key=self.pinecone_api_key)
            self.index = self.pc.Index(self.index_name)
            logger.info(f"✅ Pinecone index '{self.index_name}' connected successfully")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Pinecone index '{self.index_name}': {e}")
            raise
        
        self._text_key = "text"

    async def add_texts(
        self,
        texts: Iterable[str],
        metadatas: Optional[List[dict]] = None,
        ids: Optional[List[str]] = None,
        namespace: Optional[str] = None,
    ) -> List[str]:
        """
        Run more texts through the embeddings and add to the vectorstore.

        Args:
            texts: Iterable of strings to add to the vectorstore.
            metadatas: Optional list of metadatas associated with the texts.
            ids: Optional list of ids to associate with the texts.
            namespace: Optional pinecone namespace to add the texts to.

        Returns:
            List of ids from adding the texts into the vectorstore.
        """
        if namespace is None:
            namespace = ""
        
        # Embed and create the documents
        vectors = []
        ids = ids or [str(uuid.uuid4()) for _ in texts]
        for i, text in enumerate(texts):
            embedding = await self.create_openai_embedding(text)
            metadata = metadatas[i] if metadatas else {}
            metadata[self._text_key] = text
            vectors.append({
                "id": ids[i],
                "values": embedding,
                "metadata": metadata
            })
        
        # Upsert to Pinecone using modern SDK
        try:
            self.index.upsert(vectors=vectors, namespace=namespace)
            logger.info(f"✅ Upserted {len(vectors)} vectors to Pinecone")
        except Exception as e:
            logger.error(f"❌ Error upserting vectors: {e}")
        
        return ids

    async def similarity_search_with_score(
        self,
        query: str,
        filter: Optional[dict] = None,
        namespace: Optional[str] = None,
    ) -> List[Tuple[Document, float]]:
        """
        Return pinecone documents most similar to query, along with scores.

        Args:
            query: Text to look up documents similar to.
            filter: Dictionary of argument(s) to filter on metadata
            namespace: Namespace to search in. Default will search in '' namespace.

        Returns:
            List of Documents most similar to the query and score for each
        """
        if namespace is None:
            namespace = ""
        
        # Create embedding
        query_embedding = await self.create_openai_embedding(query)
        
        # Query Pinecone using modern SDK
        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=self.config.top_k,
                namespace=namespace,
                filter=filter,
                include_metadata=True
            )
            
            logger.info(f"🔍 Pinecone search: Found {len(results.get('matches', []))} matches for query: '{query[:100]}'")
            
            # Parse results
            docs = []
            for match in results.get("matches", []):
                metadata = match.get("metadata", {})
                
                # Try to get text from metadata (support both 'text' and 'content' keys)
                text = metadata.get(self._text_key) or metadata.get("content", "")
                
                if text:
                    score = match.get("score", 0)
                    # Remove text key from metadata to avoid duplication
                    if self._text_key in metadata:
                        text_content = metadata.pop(self._text_key)
                    elif "content" in metadata:
                        text_content = metadata.pop("content")
                    else:
                        text_content = text
                    
                    docs.append((Document(page_content=text_content, metadata=metadata), score))
                    logger.debug(f"  - Match: score={score:.4f}, text_length={len(text_content)}")
                else:
                    logger.warning(f"Found document with no `{self._text_key}` or 'content' key. Skipping.")
            
            if len(docs) == 0:
                logger.warning(f"⚠️  No relevant documents found in Pinecone for query: '{query[:100]}'")
            
            return docs
            
        except Exception as e:
            logger.error(f"❌ Error searching Pinecone: {e}")
            return []


class CustomChatGPTAgentWithRAG(ChatGPTAgent):
    """
    Custom ChatGPT Agent with RAG (Retrieval-Augmented Generation) integration.
    Extends ChatGPTAgent to inject knowledge base context into conversations.
    """
    
    def __init__(
        self,
        agent_config: ChatGPTAgentConfig,
        action_factory: Optional[AbstractActionFactory] = None,
        vector_db_factory=None,
        **kwargs,
    ):
        # Import here to avoid circular dependency
        from vocode.streaming.vector_db.factory import VectorDBFactory
        if vector_db_factory is None:
            vector_db_factory = VectorDBFactory()
        
        if action_factory is None:
            action_factory = DefaultActionFactory()
            
        super().__init__(
            agent_config=agent_config,
            action_factory=action_factory,
            **kwargs,
        )
        
        # Override vector DB creation to use custom PineconeDB
        if self.agent_config.vector_db_config:
            if isinstance(self.agent_config.vector_db_config, PineconeConfig):
                self.vector_db = CustomPineconeDB(
                    config=self.agent_config.vector_db_config,
                    aiohttp_session=None
                )
            else:
                self.vector_db = vector_db_factory.create_vector_db(
                    self.agent_config.vector_db_config
                )

    async def generate_response(
        self,
        human_input: str,
        conversation_id: str,
        is_interrupt: bool = False,
        bot_was_in_medias_res: bool = False,
    ) -> AsyncGenerator[GeneratedResponse, None]:
        """
        Generate response with RAG context injection.
        Retrieves relevant documents from knowledge base and injects them into the conversation.
        """
        assert self.transcript is not None

        chat_parameters = {}
        if self.agent_config.vector_db_config:
            try:
                docs_with_scores = await self.vector_db.similarity_search_with_score(
                    self.transcript.get_last_user_message()[1])
                
                docs_with_scores_str = "\n\n".join([
                    "Document: " + doc[0].metadata.get("source", "unknown") +
                    f" (Confidence: {doc[1]})\n" +
                    doc[0].page_content.replace(r"\n", "\n")
                    for doc in docs_with_scores
                ])

                logger.info("=" * 60)
                logger.info(
                    f"📚 RAG Context Retrieved for Conversation ID: {conversation_id}"
                )
                logger.info(f"👤 User Transcription: {human_input}")
                logger.info(
                    f"📄 Retrieved Knowledge (Context Chunks): \n{docs_with_scores_str}"
                )
                logger.info("=" * 60)

                vector_db_result = (
                    f"Found {len(docs_with_scores)} similar documents:\n{docs_with_scores_str}"
                )
                messages = format_openai_chat_messages_from_transcript(
                    self.transcript,
                    self.agent_config.model_name,
                    self.functions if hasattr(self, 'functions') else None,
                    self.agent_config.prompt_preamble,
                )
                messages.insert(
                    -1,
                    vector_db_result_to_openai_chat_message(vector_db_result))
                chat_parameters = self.get_chat_parameters(messages)
            except Exception as e:
                logger.error(f"Error while hitting vector db: {e}",
                             exc_info=True)
                chat_parameters = self.get_chat_parameters()
        else:
            chat_parameters = self.get_chat_parameters()
        chat_parameters["stream"] = True

        openai_chat_messages: List = chat_parameters.get("messages", [])

        backchannelled = "false"
        backchannel: Optional[BotBackchannel] = None
        if (self.agent_config.use_backchannels and not bot_was_in_medias_res
                and self.should_backchannel(human_input)):
            backchannel = self.choose_backchannel()
        elif self.agent_config.first_response_filler_message and self.is_first_response():
            backchannel = BotBackchannel(
                text=self.agent_config.first_response_filler_message)

        if backchannel is not None:
            # The LLM needs the backchannel context manually - otherwise we're in a race condition
            # between sending the response and generating ChatGPT's response
            openai_chat_messages.append({
                "role": "assistant",
                "content": backchannel.text
            })
            yield GeneratedResponse(
                message=backchannel,
                is_interruptible=True,
            )
            backchannelled = "true"

        span_tags = sentry_span_tags.value
        if span_tags:
            span_tags["prior_backchannel"] = backchannelled
            sentry_span_tags.set(span_tags)

        first_sentence_total_span = sentry_create_span(
            sentry_callable=sentry_sdk.start_span,
            op=CustomSentrySpans.LLM_FIRST_SENTENCE_TOTAL)

        ttft_span = sentry_create_span(
            sentry_callable=sentry_sdk.start_span,
            op=CustomSentrySpans.TIME_TO_FIRST_TOKEN)

        stream = await self._create_openai_stream(chat_parameters)

        response_generator = collate_response_async
        using_input_streaming_synthesizer = (
            self.conversation_state_manager.using_input_streaming_synthesizer()
        )
        if using_input_streaming_synthesizer:
            response_generator = stream_response_async
        async for message in response_generator(
                conversation_id=conversation_id,
                gen=openai_get_tokens(stream, ),
                get_functions=True,
                sentry_span=ttft_span,
        ):
            if first_sentence_total_span:
                first_sentence_total_span.finish()

            ResponseClass = (StreamedResponse
                             if using_input_streaming_synthesizer else
                             GeneratedResponse)
            MessageType = LLMToken if using_input_streaming_synthesizer else BaseMessage
            if isinstance(message, str):
                yield ResponseClass(
                    message=MessageType(text=message),
                    is_interruptible=True,
                )
            else:
                yield ResponseClass(
                    message=message,
                    is_interruptible=True,
                )


# Combined SSML + RAG Agent
class CustomSSMLChatGPTAgentWithRAG(CustomChatGPTAgentWithRAG):
    """
    Combined wrapper that provides both SSML pronunciation AND RAG functionality.
    This is the recommended agent to use for production.
    """
    
    def __init__(
        self,
        agent_config: ChatGPTAgentConfig,
        action_factory: Optional[AbstractActionFactory] = None,
        vector_db_factory=None,
        language: str = "en",
        **kwargs,
    ):
        """Initialize the Custom SSML + RAG agent wrapper."""
        super().__init__(
            agent_config=agent_config,
            action_factory=action_factory,
            vector_db_factory=vector_db_factory,
            **kwargs
        )
        self.language = language.lower()
        logger.info(f"🎤📚 Custom SSML + RAG Agent initialized for language: {self.language} (SSML pronunciation + Knowledge Base)")
    
    def add_ssml_pronunciation(self, text: str) -> str:
        """
        Convert text to SSML with proper pronunciation for special characters.
        Language-aware transformations for English, French, and Spanish.
        """
        import re
        
        if not text:
            return text
        
        # Remove asterisks completely (don't speak them)
        text = text.replace("*", "")
        
        # Language-specific transformations
        if self.language == "fr":
            # French-specific transformations
            # Convert prices - handle both comma and dot as decimal separator
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:euros?|€)\b', 
                          lambda m: f"{int(m.group(1))} centimes", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} centimes", text)
            text = re.sub(r'\b0[.,](\d{1,2})\s*€', 
                          lambda m: f"{int(m.group(1))} centimes", text)
            
            # Handle larger euro amounts
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} centimes" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} centimes" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text)
            text = re.sub(r'\b(\d+)\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            
            # Handle dollars
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:dollars?|\$)\b', 
                          lambda m: f"{int(m.group(1))} cents", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} cents", text)
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:dollars?|\$)\b',
                          lambda m: f"{m.group(1)} dollars {int(m.group(2))} cents" if int(m.group(2)) > 0 else f"{m.group(1)} dollars", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} dollars {int(m.group(2))} cents" if int(m.group(2)) > 0 else f"{m.group(1)} dollars", text)
            
            # Replace @ with "arobase" (French term)
            text = text.replace("@", " arobase ")
            
            # Replace dots with "point"
            def replace_dot_fr(match):
                return f"{match.group(1)} point {match.group(2)}"
            text = re.sub(r'([a-zA-Z0-9])[.,]([a-zA-Z0-9])', replace_dot_fr, text)
            text = text.replace("...", " point point point ")
            
        elif self.language == "es":
            # Spanish-specific transformations
            # Convert prices - handle both comma and dot as decimal separator
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:euros?|€)\b', 
                          lambda m: f"{int(m.group(1))} céntimos", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} céntimos", text)
            text = re.sub(r'\b0[.,](\d{1,2})\s*€', 
                          lambda m: f"{int(m.group(1))} céntimos", text)
            
            # Handle larger euro amounts
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} céntimos" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            text = re.sub(r'€\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} euros {int(m.group(2))} céntimos" if int(m.group(2)) > 0 else f"{m.group(1)} euros", text)
            text = re.sub(r'\b(\d+)\s*(?:euros?|€)\b',
                          lambda m: f"{m.group(1)} euros", text, flags=re.IGNORECASE)
            
            # Handle dollars
            text = re.sub(r'\b0[.,](\d{1,2})\s*(?:dólares?|\$)\b', 
                          lambda m: f"{int(m.group(1))} centavos", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*0[.,](\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} centavos", text)
            text = re.sub(r'\b(\d+)[.,](\d{2})\s*(?:dólares?|\$)\b',
                          lambda m: f"{m.group(1)} dólares {int(m.group(2))} centavos" if int(m.group(2)) > 0 else f"{m.group(1)} dólares", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*(\d+)[.,](\d{2})\b',
                          lambda m: f"{m.group(1)} dólares {int(m.group(2))} centavos" if int(m.group(2)) > 0 else f"{m.group(1)} dólares", text)
            
            # Replace @ with "arroba" (Spanish term)
            text = text.replace("@", " arroba ")
            
            # Replace dots with "punto"
            def replace_dot_es(match):
                return f"{match.group(1)} punto {match.group(2)}"
            text = re.sub(r'([a-zA-Z0-9])[.,]([a-zA-Z0-9])', replace_dot_es, text)
            text = text.replace("...", " punto punto punto ")
            
        else:
            # English (default)
            # Handle amounts less than $1 (e.g., $0.33 → "33 cents")
            text = re.sub(r'\b0\.(\d{1,2})\s*(?:dollars?)\b', 
                          lambda m: f"{int(m.group(1))} cents", text, flags=re.IGNORECASE)
            text = re.sub(r'\$\s*0\.(\d{1,2})\b', 
                          lambda m: f"{int(m.group(1))} cents", text)
            text = re.sub(r'\b0\.(\d{1,2})\s*\$', 
                          lambda m: f"{int(m.group(1))} cents", text)
            
            # Handle amounts $1 and above with cents (e.g., $1.33 → "1 dollar and 33 cents")
            def format_dollars_with_cents(match):
                dollars = int(match.group(1))
                cents = int(match.group(2))
                
                # Singular or plural for dollars
                dollar_word = "dollar" if dollars == 1 else "dollars"
                
                # Only add cents if non-zero
                if cents > 0:
                    return f"{dollars} {dollar_word} and {cents} cents"
                else:
                    return f"{dollars} {dollar_word}"
            
            # Match patterns like $1.33, $10.50, 1.33 dollars, etc.
            text = re.sub(r'\$\s*(\d+)\.(\d{2})\b', format_dollars_with_cents, text)
            text = re.sub(r'\b(\d+)\.(\d{2})\s*(?:dollars?)\b', format_dollars_with_cents, text, flags=re.IGNORECASE)
            text = re.sub(r'\b(\d+)\.(\d{2})\s*\$', format_dollars_with_cents, text)
            
            # Handle whole dollar amounts (e.g., $100 → "100 dollars")
            text = re.sub(r'\$\s*(\d+)\b(?!\.)', 
                          lambda m: f"{m.group(1)} {'dollar' if int(m.group(1)) == 1 else 'dollars'}", text)
            text = re.sub(r'\b(\d+)\s*(?:dollars?)\b', 
                          lambda m: f"{m.group(1)} {'dollar' if int(m.group(1)) == 1 else 'dollars'}", text, flags=re.IGNORECASE)
            
            # Replace @ with "at"
            text = text.replace("@", " at ")
            
            # Replace dots in technical contexts (but not in prices - those are already handled above)
            def replace_dot_in_technical_context(match):
                return f"{match.group(1)} dot {match.group(2)}"
            text = re.sub(r'([a-zA-Z0-9])\.([a-zA-Z0-9])', replace_dot_in_technical_context, text)
            text = text.replace("...", " dot dot dot ")
        
        # Clean up spaces (common to all languages)
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    async def generate_response(
        self,
        human_input: str,
        conversation_id: str,
        is_interrupt: bool = False,
        bot_was_in_medias_res: bool = False,
    ) -> AsyncGenerator[GeneratedResponse, None]:
        """
        Generate response with both RAG context injection AND SSML processing.
        """
        # Call parent's RAG-enabled generate_response
        async for response in super().generate_response(
            human_input=human_input,
            conversation_id=conversation_id,
            is_interrupt=is_interrupt,
            bot_was_in_medias_res=bot_was_in_medias_res,
        ):
            # Add SSML processing to the response
            if isinstance(response.message, BaseMessage):
                original_text = response.message.text
                processed_text = self.add_ssml_pronunciation(original_text)
                
                if original_text != processed_text:
                    logger.debug(f"🎤 SSML [{self.language}]: '{original_text[:50]}...' → '{processed_text[:50]}...'")
                
                response.message.text = processed_text
            
            yield response


# Factory function to create custom vector DB instances
class CustomVectorDBFactory:
    """Factory to create custom vector DB instances"""
    
    def create_vector_db(
        self,
        vector_db_config: PineconeConfig,
        aiohttp_session=None,
    ) -> VectorDB:
        if isinstance(vector_db_config, PineconeConfig):
            return CustomPineconeDB(config=vector_db_config, aiohttp_session=aiohttp_session)
        raise Exception("Invalid vector db config", vector_db_config.type)
