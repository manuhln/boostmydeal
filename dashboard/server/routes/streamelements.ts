import express from 'express';
import { StreamElementsService } from '../services/StreamElementsService';

const router = express.Router();
const streamElementsService = new StreamElementsService();

// GET /api/streamelements/voices - Get all Stream Elements voices
router.get('/voices', streamElementsService.handleGetVoices.bind(streamElementsService));

export default router;