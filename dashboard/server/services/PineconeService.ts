import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

interface PineconeVector {
  id: string;
  values: number[];
  metadata: {
    agentId: string;
    knowledgeBaseId: string;
    chunkIndex: number;
    text: string;
    source: string;
    organizationId: string;
    documentName?: string;
    timestamp: number;
  };
}

export class PineconeService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  private embeddingModel = 'text-embedding-ada-002';

  constructor() {
    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.indexName = process.env.PINECONE_INDEX_NAME || 'default-index';
  }

  /**
   * Generate embeddings using text-embedding-ada-002 model
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Truncate text if too long (Ada model has 8191 token limit)
      if (text.length > 8000) {
        text = text.substring(0, 8000);
      }

      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ [PineconeService] Error generating embeddings:', error);
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Store knowledge base chunks as vectors in Pinecone
   */
  async storeKnowledgeBaseVectors(
    agentId: string,
    knowledgeBaseId: string,
    chunks: string[],
    organizationId: string,
    documentName?: string
  ): Promise<void> {
    try {
      // Ensure IDs are strings (convert MongoDB ObjectIds to strings)
      const agentIdStr = agentId.toString();
      const knowledgeBaseIdStr = knowledgeBaseId.toString();
      const organizationIdStr = organizationId.toString();
      
      console.log(`🔗 [PineconeService] Storing ${chunks.length} vectors for agent ${agentIdStr}, knowledge base ${knowledgeBaseIdStr}`);

      const index = this.pinecone.index(this.indexName);
      const vectors: PineconeVector[] = [];

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`📊 [PineconeService] Generating embedding for chunk ${i + 1}/${chunks.length}`);
        
        const embedding = await this.generateEmbeddings(chunk);
        
        const vector: PineconeVector = {
          id: `${knowledgeBaseIdStr}-${agentIdStr}-chunk-${i}`,
          values: embedding,
          metadata: {
            agentId: agentIdStr,
            knowledgeBaseId: knowledgeBaseIdStr,
            chunkIndex: i,
            text: chunk,
            source: documentName || 'Unknown Document',
            organizationId: organizationIdStr,
            documentName: documentName || 'Unknown Document',
            timestamp: Date.now(),
          },
        };

        vectors.push(vector);
      }

      // Upsert vectors to Pinecone in batches (Pinecone recommends batch size of 100)
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        console.log(`📤 [PineconeService] Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
        
        await index.upsert(batch);
      }

      console.log(`✅ [PineconeService] Successfully stored ${vectors.length} vectors for agent ${agentId}`);
    } catch (error) {
      console.error('❌ [PineconeService] Error storing vectors:', error);
      throw new Error(
        `Failed to store vectors in Pinecone: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete all vectors for a specific agent and knowledge base
   */
  async deleteKnowledgeBaseVectors(
    agentId: string,
    knowledgeBaseId: string
  ): Promise<void> {
    try {
      // Ensure IDs are strings (convert MongoDB ObjectIds to strings)
      const agentIdStr = agentId.toString();
      const knowledgeBaseIdStr = knowledgeBaseId.toString();
      
      console.log(`🗑️ [PineconeService] Deleting vectors for agent ${agentIdStr}, knowledge base ${knowledgeBaseIdStr}`);

      const index = this.pinecone.index(this.indexName);
      
      // Delete by prefix (all vectors with the specific knowledge base and agent)
      const prefix = `${knowledgeBaseIdStr}-${agentIdStr}-chunk-`;
      
      // First, query to get all vector IDs with this prefix
      const queryResponse = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector for search
        topK: 10000, // Get up to 10k results
        includeMetadata: true,
        filter: {
          agentId: { $eq: agentIdStr },
          knowledgeBaseId: { $eq: knowledgeBaseIdStr }
        }
      });

      // Extract vector IDs
      const vectorIds = queryResponse.matches?.map(match => match.id) || [];
      
      if (vectorIds.length > 0) {
        // Delete vectors by IDs
        await index.deleteMany(vectorIds);
        console.log(`✅ [PineconeService] Deleted ${vectorIds.length} vectors`);
      } else {
        console.log(`ℹ️ [PineconeService] No vectors found to delete`);
      }
    } catch (error) {
      console.error('❌ [PineconeService] Error deleting vectors:', error);
      throw new Error(
        `Failed to delete vectors from Pinecone: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update vectors for a knowledge base (delete old ones and create new ones)
   */
  async updateKnowledgeBaseVectors(
    agentId: string,
    knowledgeBaseId: string,
    chunks: string[],
    organizationId: string,
    documentName?: string
  ): Promise<void> {
    try {
      // Ensure IDs are strings (convert MongoDB ObjectIds to strings)
      const agentIdStr = agentId.toString();
      const knowledgeBaseIdStr = knowledgeBaseId.toString();
      
      console.log(`🔄 [PineconeService] Updating vectors for agent ${agentIdStr}, knowledge base ${knowledgeBaseIdStr}`);
      
      // Delete existing vectors
      await this.deleteKnowledgeBaseVectors(agentIdStr, knowledgeBaseIdStr);
      
      // Store new vectors
      await this.storeKnowledgeBaseVectors(agentIdStr, knowledgeBaseIdStr, chunks, organizationId, documentName);
      
      console.log(`✅ [PineconeService] Successfully updated vectors for agent ${agentIdStr}`);
    } catch (error) {
      console.error('❌ [PineconeService] Error updating vectors:', error);
      throw error;
    }
  }

  /**
   * Check Pinecone connection and index status
   */
  async checkConnection(): Promise<boolean> {
    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();
      console.log(`✅ [PineconeService] Connected to Pinecone index: ${this.indexName}`);
      console.log(`📊 [PineconeService] Index stats:`, stats);
      return true;
    } catch (error) {
      console.error('❌ [PineconeService] Connection failed:', error);
      return false;
    }
  }
}

export const pineconeService = new PineconeService();
