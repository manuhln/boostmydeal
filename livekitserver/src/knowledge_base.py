"""Pinecone Knowledge Base Integration for RAG"""
import os
import logging
from typing import List, Optional
from pinecone import Pinecone
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class KnowledgeBase:
    """Pinecone-based knowledge base for RAG"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        index_name: Optional[str] = None,
        openai_api_key: Optional[str] = None
    ):
        """Initialize Pinecone knowledge base
        
        Args:
            api_key: Pinecone API key (defaults to PINECONE_API_KEY env var)
            index_name: Pinecone index name (defaults to PINECONE_INDEX_NAME env var)
            openai_api_key: OpenAI API key for embeddings
        """
        self.api_key = api_key or os.getenv("PINECONE_API_KEY")
        self.index_name = index_name or os.getenv("PINECONE_INDEX_NAME")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        
        if not self.api_key or not self.index_name:
            logger.warning("Pinecone credentials not configured - knowledge base disabled")
            self.enabled = False
            return
        
        try:
            # Initialize Pinecone
            self.pc = Pinecone(api_key=self.api_key)
            self.index = self.pc.Index(self.index_name)
            
            # Initialize OpenAI for embeddings (async client)
            self.openai_client = AsyncOpenAI(api_key=self.openai_api_key)
            
            self.enabled = True
            logger.info(f"Pinecone knowledge base initialized: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
            self.enabled = False
    
    async def get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI (async)"""
        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []
    
    async def search(self, query: str, top_k: int = 3, min_score: float = 0.7) -> str:
        """Search knowledge base for relevant context (async for function tool)
        
        Args:
            query: Search query
            top_k: Number of results to return
            min_score: Minimum similarity score (0.0 to 1.0)
            
        Returns:
            Formatted string with relevant context or error message
        """
        if not self.enabled:
            return "Knowledge base is not available."
        
        try:
            # Generate query embedding
            query_embedding = await self.get_embedding(query)
            if not query_embedding:
                return "Failed to process the query."
            
            # Search Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            # Extract high-confidence results
            context_chunks = []
            for match in results.matches:
                if match.score >= min_score and match.metadata and 'text' in match.metadata:
                    context_chunks.append(match.metadata['text'])
                    logger.info(f"Found relevant context (score: {match.score:.3f})")
            
            if not context_chunks:
                return "No relevant information found in the knowledge base."
            
            # Format results for LLM
            return "\n\n".join(context_chunks)
            
        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            return f"Error searching knowledge base: {str(e)}"
    
    def format_context(self, context_chunks: List[str]) -> str:
        """Format context chunks into a single string for LLM"""
        if not context_chunks:
            return ""
        
        formatted = "**Relevant Knowledge Base Information:**\n\n"
        for i, chunk in enumerate(context_chunks, 1):
            formatted += f"{i}. {chunk}\n\n"
        
        return formatted
