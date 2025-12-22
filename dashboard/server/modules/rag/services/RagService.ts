import { OpenAI } from "openai";
import { createRequire } from "module";
import { pineconeService } from "../../../services/PineconeService";

// Use createRequire for CommonJS modules in ES modules
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RAGResponse {
  summary: string;
  keyPoints: string[];
  totalChunks: number;
  textLength: number;
}

export class RagService {
  private embeddingModel = "text-embedding-ada-002";
  private chatModel = "gpt-4o-mini";
  private maxContextLength = 100000;

  async generateEmbeddings(text: string): Promise<number[]> {
    // Delegate to Pinecone service which uses text-embedding-ada-002
    return await pineconeService.generateEmbeddings(text);
  }

  chunkText(text: string, chunkSize = 5000, overlap = 200): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // Try to break at sentence boundaries
      if (end < text.length) {
        for (let i = end; i > start + chunkSize - 100 && i > start; i--) {
          if (".!?".includes(text[i])) {
            end = i + 1;
            break;
          }
        }
      }

      const chunk = text.substring(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      start = Math.max(start + chunkSize - overlap, end);
      if (start >= text.length) break;
    }

    return chunks;
  }

  async generateRAGResponse(
    text: string,
    agentId: string,
  ): Promise<RAGResponse> {
    try {
      console.log(`🧠 [RAG] Processing document for agent: ${agentId}`);

      // Split text into chunks
      const chunks = this.chunkText(text);
      console.log(`📄 [RAG] Split into ${chunks.length} chunks`);

      // Prepare context from chunks
      let context = "";
      let totalLength = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = `[Chunk ${i + 1}]: ${chunks[i]}`;
        if (totalLength + chunkText.length <= this.maxContextLength) {
          context += chunkText + "\n\n";
          totalLength += chunkText.length;
        } else {
          break;
        }
      }

      const systemPrompt = `You are a helpful AI assistant that analyzes documents and creates comprehensive knowledge base summaries. 
      Your task is to extract the most important information and create a structured summary that can be used by a voice AI assistant.

      Please provide:
      1. It should be detailed for each any every point and line of the document
      2. Key points and important facts (as bullet points)
      3. Any actionable information or instructions

      Format your response as a JSON object with the following structure:
      {
        "summary": "Comprehensive summary of the document",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
      }`;

      const userPrompt = `Please analyze this document and provide a structured knowledge base summary:

Document Content:
${context}

Please extract the key information and format it according to the instructions above.`;

      const response = await openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        // The max_tokens parameter was removed to allow the model to generate a full response.
        // The model will now determine the appropriate length for the summary.
        response_format: { type: "json_object" },
      });

      const responseContent = response.choices[0]?.message?.content?.trim();
      if (!responseContent) {
        throw new Error("No response generated from OpenAI");
      }

      try {
        const parsedResponse = JSON.parse(responseContent);
        console.log(
          `✅ [RAG] Successfully generated knowledge base for agent: ${agentId}`,
        );

        return {
          summary: parsedResponse.summary || "Summary not available",
          keyPoints: parsedResponse.keyPoints || [],
          totalChunks: chunks.length,
          textLength: text.length,
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        console.warn("Failed to parse JSON response, using fallback format");
        return {
          summary: responseContent,
          keyPoints: [],
          totalChunks: chunks.length,
          textLength: text.length,
        };
      }
    } catch (error) {
      console.error("Error generating RAG response:", error);
      throw new Error(
        `Failed to generate RAG response: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async extractPDFText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      throw new Error(
        `Failed to extract PDF text: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async processDocumentAndGenerate(
    documentText: string,
    agentId: string,
  ): Promise<RAGResponse> {
    try {
      console.log(`Processing document for agent: ${agentId}`);

      if (!documentText.trim()) {
        throw new Error("No text content found in document");
      }

      // Generate RAG response
      const ragResponse = await this.generateRAGResponse(documentText, agentId);

      console.log(`Successfully generated response for agent: ${agentId}`);
      return ragResponse;
    } catch (error) {
      console.error("Error in processDocumentAndGenerate:", error);
      throw new Error(
        `Failed to process document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process knowledge base document for RAG during agent creation
   * Now stores vectors in Pinecone for training
   */
  async processKnowledgeBaseDocument(knowledgeBaseId: string, agentId: string, organizationId: string) {
    try {
      console.log(
        `🧠 [RAG Service] Processing knowledge base document: ${knowledgeBaseId} for agent: ${agentId}`,
      );

      // Get knowledge base document from MongoDB
      const mongoose = await import("mongoose");
      const KnowledgeBase = mongoose.default.model("KnowledgeBase");
      const document = await KnowledgeBase.findById(knowledgeBaseId);

      if (!document) {
        throw new Error("Knowledge base document not found");
      }

      // Read PDF from file system
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), document.filePath);

      if (!fs.existsSync(filePath)) {
        const errorMsg = `PDF file not found for "${document.name}". The file may have been deleted or not uploaded properly. Expected path: ${document.filePath}`;
        console.error(`❌ [RAG Service] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const fileBuffer = fs.readFileSync(filePath);

      // Extract text from PDF
      const extractedText = await this.extractPDFText(fileBuffer);
      
      if (!extractedText.trim()) {
        throw new Error("No text content found in PDF");
      }

      // Split text into chunks for vector storage
      const chunks = this.chunkText(extractedText);
      console.log(`📄 [RAG Service] Split document into ${chunks.length} chunks`);

      // Store vectors in Pinecone for training
      await pineconeService.updateKnowledgeBaseVectors(
        agentId,
        knowledgeBaseId,
        chunks,
        organizationId,
        document.name
      );

      // Generate traditional RAG response for backward compatibility
      const ragResponse = await this.generateRAGResponse(extractedText, agentId);

      console.log(
        `✅ [RAG Service] Successfully processed knowledge base document: ${document.name}`,
      );
      console.log(`📊 [RAG Service] Stored ${chunks.length} vectors in Pinecone for training`);

      return {
        success: true,
        data: {
          knowledgeBaseId,
          documentName: document.name,
          ragResponse,
          vectorsStored: chunks.length,
          pineconeTraining: true,
        },
      };
    } catch (error) {
      console.error(
        `❌ [RAG Service] Error processing knowledge base document:`,
        error,
      );
      throw error;
    }
  }
}

export const ragService = new RagService();
