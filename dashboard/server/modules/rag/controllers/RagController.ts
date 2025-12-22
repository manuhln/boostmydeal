import { Request, Response } from 'express';
import { ragService } from '../services/RagService';
import multer from 'multer';
import path from 'path';

// Extend Request interface to include file property
interface MulterRequest extends Request {
  file?: any;
}

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

const upload = multer({
  storage: storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

export class RagController {
  // Single file upload middleware
  static uploadSingle = upload.single('pdf');

  static async processPDF(req: MulterRequest, res: Response) {
    try {
      console.log('📄 [RAG] Received PDF processing request');
      
      // Validate request
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided'
        });
      }

      const agentId = req.body.agentId || 'default';
      
      console.log(`📄 [RAG] Processing PDF for agent: ${agentId}`);
      
      try {
        // Extract text from PDF buffer
        const extractedText = await ragService.extractPDFText(req.file.buffer);
        
        if (!extractedText.trim()) {
          return res.status(400).json({
            success: false,
            error: 'No text content found in PDF'
          });
        }

        // Generate RAG response
        const ragResponse = await ragService.processDocumentAndGenerate(extractedText, agentId);
        
        console.log(`✅ [RAG] Successfully processed PDF for agent: ${agentId}`);
        
        res.json({
          success: true,
          data: {
            ragResponse,
            agentId,
            fileName: req.file.originalname,
            fileSize: req.file.size
          }
        });
        
      } catch (processingError) {
        console.error('Error processing PDF:', processingError);
        res.status(500).json({
          success: false,
          error: `Failed to process PDF: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
        });
      }
      
    } catch (error) {
      console.error('Error in PDF processing endpoint:', error);
      res.status(500).json({
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  static async processKnowledgeBase(req: Request, res: Response) {
    try {
      console.log('🧠 [RAG] Received knowledge base processing request');
      
      const { knowledgeBaseId, agentId } = req.body;
      const organizationId = (req as any).user?.organizationId;
      
      if (!knowledgeBaseId || !agentId) {
        return res.status(400).json({
          success: false,
          error: 'Knowledge base ID and agent ID are required'
        });
      }

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization context required'
        });
      }

      console.log(`🧠 [RAG] Processing knowledge base item ${knowledgeBaseId} for agent: ${agentId} in organization: ${organizationId}`);
      
      try {
        // Process knowledge base document with Pinecone training
        const result = await ragService.processKnowledgeBaseDocument(knowledgeBaseId, agentId, organizationId);
        
        console.log(`✅ [RAG] Successfully processed knowledge base item for agent: ${agentId}`);
        
        res.json(result);
        
      } catch (processingError) {
        console.error('Error processing knowledge base:', processingError);
        res.status(500).json({
          success: false,
          error: `Failed to process knowledge base: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
        });
      }
      
    } catch (error) {
      console.error('Error in knowledge base processing endpoint:', error);
      res.status(500).json({
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  static async testRAG(req: Request, res: Response) {
    try {
      const { text, agentId } = req.body;
      
      if (!text || !agentId) {
        return res.status(400).json({
          success: false,
          error: 'Text and agentId are required'
        });
      }

      const ragResponse = await ragService.processDocumentAndGenerate(text, agentId);
      
      res.json({
        success: true,
        data: {
          ragResponse,
          agentId
        }
      });
      
    } catch (error) {
      console.error('Error in RAG test endpoint:', error);
      res.status(500).json({
        success: false,
        error: `Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
}