import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as incomeController from '../controllers/incomeController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', incomeController.getIncomeLedger);
router.post('/', authorize(...managers), incomeController.recordIncome);
router.put('/:id', authorize(...managers), incomeController.updateIncome);
router.delete('/:id', authorize(...managers), incomeController.deleteIncome);

export default router;
