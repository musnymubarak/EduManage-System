import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as feeController from '../controllers/feeController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.get('/payments', feeController.getAllFeePayments);
router.post('/payments', authorize(...managers), feeController.recordPayment);
router.put('/payments/:id', authorize(...managers), feeController.updateFeePayment);
router.post('/partial-payment', authorize(...managers), feeController.recordPartialPayment);
router.get('/student/:studentId', feeController.getStudentFeeHistory);
router.get('/monthly-status', feeController.getMonthlyFeeStatus);
router.get('/pending', feeController.getPendingPayments);
router.get('/report', feeController.getFeeReport);

export default router;
