import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as commonController from '../controllers/commonController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

// Classes
router.get('/classes', commonController.getAllClasses);

// Exams
router.get('/exams', commonController.getAllExams);
router.post('/exams', authorize(...managers), commonController.createExam);
router.get('/exams/:examId/marks', commonController.getExamMarks);
router.post('/exams/:examId/marks', authorize(...managers), commonController.enterExamMarks);
router.get('/exams/:examId/report', commonController.getExamReport);

// Inventory
router.get('/inventory', commonController.getAllInventory);
router.post('/inventory', authorize(...managers), commonController.addInventoryItem);
router.put('/inventory/:id', authorize(...managers), commonController.updateInventoryItem);
router.patch('/inventory/:id/quantity', authorize(...managers), commonController.updateInventoryStock);
router.get('/inventory/low-stock', commonController.getLowStockItems);

// Teacher Schedule
router.post('/schedules', authorize(...managers), commonController.assignTeacherSchedule);
router.get('/schedules', commonController.getTeacherSchedules);

// Donations
router.get('/donations', commonController.getAllDonations);
router.post('/donations', authorize(...managers), commonController.recordDonation);
router.get('/donations/report', commonController.getDonationReport);

// Expenditures - Only Expenditure Receptionist
router.post(
  '/expenditures',
  authorize('EXPENDITURE_RECEPTIONIST', 'SUPER_ADMIN'),
  commonController.recordExpenditure
);
router.get('/expenditures', commonController.getAllExpenditures);
router.get('/expenditures/report', commonController.getExpenditureReport);

export default router;
