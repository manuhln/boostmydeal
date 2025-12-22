import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export interface RAGResponse {
  summary: string;
  keyPoints: string[];
  totalChunks: number;
  textLength: number;
}

export class RAGService {
  private embeddingModel = "text-embedding-3-small";
  private chatModel = "gpt-4o";
  private maxContextLength = 4000;

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Truncate text if too long
      if (text.length > 8000) {
        text = text.substring(0, 8000);
      }

      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
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
          if ('.!?'.includes(text[i])) {
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

  async generateRAGResponse(text: string, agentId: string): Promise<RAGResponse> {
    try {
      console.log(`🧠 [RAG] Processing document for agent: ${agentId}`);
      
      // Split text into chunks
      const chunks = this.chunkText(text);
      console.log(`📄 [RAG] Split into ${chunks.length} chunks`);

      // Generate embeddings for chunks (for future use in vector search)
      const embeddings = await Promise.all(
        chunks.map(chunk => this.generateEmbeddings(chunk))
      );

      // Prepare context from chunks
      let context = '';
      let totalLength = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = `[Chunk ${i + 1}]: ${chunks[i]}`;
        if (totalLength + chunkText.length <= this.maxContextLength) {
          context += chunkText + '\n\n';
          totalLength += chunkText.length;
        } else {
          break;
        }
      }

      const systemPrompt = `You are a helpful AI assistant that analyzes documents and creates comprehensive knowledge base summaries. 
      Your task is to extract the most important information and create a structured summary that can be used by a voice AI assistant.
      
      Please provide:
      1. A comprehensive summary of the document (2-3 paragraphs)
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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0]?.message?.content?.trim();
      if (!responseContent) {
        throw new Error("No response generated from OpenAI");
      }

      try {
        const parsedResponse = JSON.parse(responseContent);
        console.log(`✅ [RAG] Successfully generated knowledge base for agent: ${agentId}`);
        
        return {
          summary: parsedResponse.summary || "Summary not available",
          keyPoints: parsedResponse.keyPoints || [],
          totalChunks: chunks.length,
          textLength: text.length
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        console.warn('Failed to parse JSON response, using fallback format');
        return {
          summary: responseContent,
          keyPoints: [],
          totalChunks: chunks.length,
          textLength: text.length
        };
      }
    } catch (error) {
      console.error('Error generating RAG response:', error);
      throw new Error(`Failed to generate RAG response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractPDFText(file: File): Promise<string> {
    try {
      // Since we're in the browser, we'll use the pdf-parse library differently
      // For now, we'll read the file as text and hope it contains readable content
      // In a production environment, this should be handled server-side
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // For demonstration, we'll extract text using a simple approach
      // In production, you'd want to use a proper PDF parsing library server-side
      const textDecoder = new TextDecoder('utf-8');
      let text = textDecoder.decode(uint8Array);
      
      // Clean up the text (remove PDF binary markers and non-readable content)
      text = text.replace(/[^\x20-\x7E\n\r]/g, ' ')  // Remove non-printable chars
                 .replace(/\s+/g, ' ')                // Normalize whitespace
                 .trim();
      
      if (text.length < 50) {
        throw new Error('Unable to extract readable text from PDF. Please try a text-based PDF.');
      }
      
      return text;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const ragService = new RAGService();