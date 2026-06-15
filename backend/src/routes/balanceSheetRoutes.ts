import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as balanceSheetController from '../controllers/balanceSheetController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', authorize(...managers), balanceSheetController.getMonthlyBalanceSheet);

export default router;
