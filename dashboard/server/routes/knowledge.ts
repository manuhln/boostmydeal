import express from 'express';
import { KnowledgeController } from '../modules/knowledge/controllers/KnowledgeController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const knowledgeController = new KnowledgeController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/knowledge - Get all knowledge base documents
router.get('/', knowledgeController.getKnowledgeBase.bind(knowledgeController));

// POST /api/knowledge - Create new knowledge base document
router.post('/', 
  KnowledgeController.uploadMiddleware,
  knowledgeController.createKnowledgeBase.bind(knowledgeController)
);

// POST /api/knowledge/upload - Upload multiple PDFs
router.post('/upload',
  KnowledgeController.uploadMultipleMiddleware,
  knowledgeController.uploadMultiplePDFs.bind(knowledgeController)
);

// DELETE /api/knowledge/:id - Delete knowledge base document
router.delete('/:id', knowledgeController.deleteKnowledgeBase.bind(knowledgeController));

export default router;