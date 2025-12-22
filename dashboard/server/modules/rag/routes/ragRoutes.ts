import { Router } from 'express';
import { RagController } from '../controllers/RagController';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// PDF processing endpoint
router.post('/process-pdf', RagController.uploadSingle, RagController.processPDF);

// Process knowledge base item for RAG during agent creation
router.post('/process-knowledge-base', RagController.processKnowledgeBase);

// Test RAG endpoint
router.post('/test', RagController.testRAG);

export default router;