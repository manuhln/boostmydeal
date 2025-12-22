import express from 'express';
import { SmallestAIService } from '../services/SmallestAIService';

const router = express.Router();
const smallestAIService = new SmallestAIService();

router.get('/voices', smallestAIService.handleGetVoices.bind(smallestAIService));

export default router;
