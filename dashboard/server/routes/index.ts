import { Router } from 'express';
import agentRoutes from '../modules/agent/agents';
import metricRoutes from './metrics';
import providerRoutes from './providers';
import userRoutes from '../modules/user/users';
import integrationRoutes from '../modules/integration/integrations';
import phoneNumberRoutes from '../modules/phone_number/phone_numbers';
import callSystemRoutes, { webhookRouter } from '../modules/calls/routes/callRoutes';
import elevenLabsRoutes from './elevenlabs';
import streamElementsRoutes from './streamelements';
import smallestAIRoutes from './smallestai';
import workflowRoutes from '../modules/workflow/workflow.routes';
import ragRoutes from '../modules/rag/routes/ragRoutes';
import knowledgeRoutes from './knowledge';
import billingRoutes from './billingRoutes';
import teamRoutes from './teamRoutes';
import notificationRoutes from '../modules/notifications/routes/notificationRoutes';

const router = Router();

// Mount all route modules
router.use('/agents', agentRoutes);
router.use('/metrics', metricRoutes);
router.use('/providers', providerRoutes);
router.use('/users', userRoutes);
router.use('/integrations', integrationRoutes);
router.use('/phone-numbers', phoneNumberRoutes);
router.use('/elevenlabs', elevenLabsRoutes);
router.use('/streamelements', streamElementsRoutes);
router.use('/smallestai', smallestAIRoutes);
router.use('/workflows', workflowRoutes);
router.use('/rag', ragRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/billing', billingRoutes);
router.use('/team', teamRoutes);
router.use('/notifications', notificationRoutes);

// Mount webhook routes FIRST (before any auth middleware)
router.use('/webhook', webhookRouter);

// Mount new call system routes (replaces old /calls)
router.use('/calls', callSystemRoutes);

export default router;