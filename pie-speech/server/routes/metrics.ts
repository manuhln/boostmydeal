import { Router } from 'express';
import { query, param } from 'express-validator';
import { MetricController } from '../controllers/MetricController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation for date parameter
const dateValidation = [
  param('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
];

// Validation for date range query
const dateRangeValidation = [
  query('startDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  query('endDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format'),
];

// Metric routes
router.get('/today', MetricController.getTodayMetrics);
router.get('/dashboard', MetricController.getDashboardMetrics); // Dashboard metrics with tag analytics
router.get('/callsMetrics', MetricController.getMetrics); // Add call metrics route without date parameter
router.get('/range', dateRangeValidation, MetricController.getMetricsRange);
router.get('/:date', dateValidation, MetricController.getMetrics);

export default router;