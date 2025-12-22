import { Request, Response } from 'express';
import { KnowledgeBase } from '../../../models/KnowledgeBase';
import { RagService } from '../../rag/services/RagService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export class KnowledgeController {
  private ragService: RagService;

  constructor() {
    this.ragService = new RagService();
  }

  /**
   * Get all knowledge base documents for organization
   * GET /api/knowledge
   */
  async getKnowledgeBase(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const knowledge = await KnowledgeBase.find({ 
        organizationId, 
        isActive: true 
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: knowledge,
        message: 'Knowledge base retrieved successfully'
      });

    } catch (error) {
      console.error('❌ [KnowledgeController] Error getting knowledge base:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Upload and save knowledge base document
   * POST /api/knowledge
   */
  async createKnowledgeBase(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const { name, description, websiteUrl } = req.body;
      const file = req.file;

      if (!file && !websiteUrl) {
        res.status(400).json({
          success: false,
          message: 'Either file upload or website URL is required'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Name is required'
        });
        return;
      }

      let knowledgeData: any = {
        organizationId,
        name,
        description,
        websiteUrl
      };

      if (file) {
        // Sanitize filename to remove special characters
        const sanitizedOriginalName = file.originalname
          .normalize('NFD') // Decompose accented characters
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace non-ASCII with underscore
        
        // Process uploaded PDF
        const fileName = `${Date.now()}-${sanitizedOriginalName}`;
        const filePath = `uploads/knowledge/${organizationId}/${fileName}`;
        const fullPath = path.join(process.cwd(), filePath);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Save file
        fs.writeFileSync(fullPath, file.buffer);

        // Just store file info (no RAG processing) - store original name for display, sanitized for file
        knowledgeData = {
          ...knowledgeData,
          fileName: sanitizedOriginalName,
          fileType: 'PDF',
          filePath: filePath,
          fileSize: file.size
        };
      } else {
        // Handle website URL case (future implementation)
        knowledgeData = {
          ...knowledgeData,
          fileName: `${name}.url`,
          fileType: 'URL',
          filePath: websiteUrl,
          fileSize: 0
        };
      }

      const knowledge = new KnowledgeBase(knowledgeData);
      await knowledge.save();

      res.status(201).json({
        success: true,
        data: knowledge,
        message: 'Knowledge base document created successfully'
      });

    } catch (error) {
      console.error('❌ [KnowledgeController] Error creating knowledge base:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Upload multiple PDFs to knowledge base
   * POST /api/knowledge/upload
   */
  async uploadMultiplePDFs(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No PDF files provided'
        });
        return;
      }

      const uploadedKnowledge = [];

      for (const file of files) {
        // Sanitize filename to remove special characters
        const sanitizedOriginalName = file.originalname
          .normalize('NFD') // Decompose accented characters
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace non-ASCII with underscore
        
        // Process each uploaded PDF
        const fileName = `${Date.now()}-${sanitizedOriginalName}`;
        const filePath = `uploads/knowledge/${organizationId}/${fileName}`;
        const fullPath = path.join(process.cwd(), filePath);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Save file
        fs.writeFileSync(fullPath, file.buffer);

        // Create knowledge base entry (store original name for display, sanitized for file)
        const knowledgeData = {
          organizationId,
          name: file.originalname.replace('.pdf', ''),
          description: `Uploaded PDF: ${file.originalname}`,
          fileName: sanitizedOriginalName,
          fileType: 'PDF',
          filePath: filePath,
          fileSize: file.size
        };

        const knowledge = new KnowledgeBase(knowledgeData);
        await knowledge.save();
        uploadedKnowledge.push(knowledge);
      }

      res.status(201).json({
        success: true,
        data: uploadedKnowledge,
        message: `Successfully uploaded ${uploadedKnowledge.length} PDF(s) to Knowledge Base`
      });

    } catch (error) {
      console.error('❌ [KnowledgeController] Error uploading multiple PDFs:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete knowledge base document
   * DELETE /api/knowledge/:id
   */
  async deleteKnowledgeBase(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const knowledge = await KnowledgeBase.findOne({ 
        _id: id, 
        organizationId 
      });

      if (!knowledge) {
        res.status(404).json({
          success: false,
          message: 'Knowledge base document not found'
        });
        return;
      }

      // Delete file if it exists
      if (knowledge.filePath && knowledge.fileType === 'PDF') {
        const fullPath = path.join(process.cwd(), knowledge.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      // Soft delete
      knowledge.isActive = false;
      await knowledge.save();

      res.status(200).json({
        success: true,
        message: 'Knowledge base document deleted successfully'
      });

    } catch (error) {
      console.error('❌ [KnowledgeController] Error deleting knowledge base:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Middleware for file upload
  static uploadMiddleware = upload.single('file');
  
  // Middleware for multiple file uploads
  static uploadMultipleMiddleware = upload.array('pdfs', 10); // Allow up to 10 PDFs
}