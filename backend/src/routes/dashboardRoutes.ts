import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

router.use(authenticateToken);

router.get('/stats', dashboardController.getDashboardStats);

export default router;
