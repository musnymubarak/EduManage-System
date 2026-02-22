import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as commonController from '../controllers/commonController';

const router = Router();

router.use(authenticateToken);

const managers = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

// Classes
router.get('/classes', commonController.getAllClasses);

// Exams
router.post('/exams', authorize(...managers), commonController.createExam);
router.post('/exams/marks', authorize(...managers), commonController.enterExamMarks);
router.get('/exams/:examId/report', commonController.getExamReport);

// Inventory
router.get('/inventory', commonController.getAllInventory);
router.post('/inventory', authorize(...managers), commonController.addInventoryItem);
router.put('/inventory/:id', authorize(...managers), commonController.updateInventoryItem);
router.get('/inventory/low-stock', commonController.getLowStockItems);

// Teacher Schedule
router.post('/schedules', authorize(...managers), commonController.assignTeacherSchedule);
router.get('/schedules', commonController.getTeacherSchedules);

// Donations
router.post('/donations', authorize(...managers), commonController.recordDonation);
router.get('/donations/report', commonController.getDonationReport);

// Expenditures - Only Expenditure Receptionist
router.post(
  '/expenditures',
  authorize('EXPENDITURE_RECEPTIONIST', 'SUPER_ADMIN'),
  commonController.recordExpenditure
);
router.get('/expenditures/report', commonController.getExpenditureReport);

export default router;
