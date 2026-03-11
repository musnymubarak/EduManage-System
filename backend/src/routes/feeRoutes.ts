import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as feeController from '../controllers/feeController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post('/payment', authorize(...managers), feeController.recordPayment);
router.post('/partial-payment', authorize(...managers), feeController.recordPartialPayment);
router.get('/student/:studentId', feeController.getStudentFeeHistory);
router.get('/pending', feeController.getPendingPayments);
router.get('/report', feeController.getFeeReport);

export default router;
