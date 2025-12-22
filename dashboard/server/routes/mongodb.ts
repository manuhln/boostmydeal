import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { MongoVoiceService } from '../services/MongoVoiceService';
import { body, validationResult } from 'express-validator';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Agent routes
router.get('/agents', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const agents = await service.getAgents();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Failed to fetch agents' });
  }
});

router.get('/agents/:id', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const agent = await service.getAgent(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ message: 'Failed to fetch agent' });
  }
});

router.post('/agents', [
  body('name').notEmpty().withMessage('Name is required'),
  body('gender').isIn(['male', 'female', 'neutral']).withMessage('Valid gender is required'),
  body('model').notEmpty().withMessage('Model is required'),
  body('voiceProvider').notEmpty().withMessage('Voice provider is required'),
  body('voiceModel').notEmpty().withMessage('Voice model is required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new MongoVoiceService(req.organization!._id);
    const agent = await service.createAgent(req.body);
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Failed to create agent' });
  }
});

router.put('/agents/:id', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const agent = await service.updateAgent(req.params.id, req.body);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ message: 'Failed to update agent' });
  }
});

router.delete('/agents/:id', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const success = await service.deleteAgent(req.params.id);
    
    if (!success) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ message: 'Failed to delete agent' });
  }
});

// Call routes
router.get('/calls', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const filters = {
      agentId: req.query.agentId as string,
      callType: req.query.callType as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      contactName: req.query.contactName as string,
    };
    
    const calls = await service.getCalls(filters);
    res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ message: 'Failed to fetch calls' });
  }
});

router.get('/calls/:id', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const call = await service.getCall(req.params.id);
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    
    res.json(call);
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ message: 'Failed to fetch call' });
  }
});

router.post('/calls/initiate', [
  body('agentId').notEmpty().withMessage('Agent ID is required'),
  body('contactPhone').notEmpty().withMessage('Contact phone is required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new MongoVoiceService(req.organization!._id);
    const result = await service.initiateCall({
      agentId: req.body.agentId,
      contactPhone: req.body.contactPhone,
      systemPrompt: req.body.systemPrompt,
      providerType: req.body.providerType,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ 
      message: 'Failed to initiate call',
      error: (error as Error).message 
    });
  }
});

// Metrics routes
router.get('/metrics/today', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const metrics = await service.getTodayMetrics();
    
    if (!metrics) {
      // Return default metrics if none exist
      return res.json({
        totalCalls: 0,
        demosBooked: 0,
        interestedLeads: 0,
        followUps: 0,
        totalDuration: 0,
        totalCost: 0,
        successRate: 0,
        averageCallDuration: 0,
      });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching today metrics:', error);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

router.get('/metrics/:date?', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const metrics = await service.getMetrics(req.params.date);
    
    if (!metrics) {
      return res.status(404).json({ message: 'Metrics not found for this date' });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

// Contact routes
router.get('/contacts', async (req: AuthRequest, res) => {
  try {
    const service = new MongoVoiceService(req.organization!._id);
    const contacts = await service.getContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
});

router.post('/contacts', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new MongoVoiceService(req.organization!._id);
    const contact = await service.createContact(req.body);
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ message: 'Failed to create contact' });
  }
});

export default router;