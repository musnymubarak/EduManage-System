import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as commonController from '../controllers/commonController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

// Classes
router.get('/classes', commonController.getAllClasses);
router.get('/classes/:id', commonController.getClassById);
router.post('/classes', authorize(...managers), commonController.createClass);
router.put('/classes/:id', authorize(...managers), commonController.updateClass);
router.delete('/classes/:id', authorize(...managers), commonController.deleteClass);
router.get('/classes/:id/students', commonController.getClassStudents);
router.post('/classes/:id/students', authorize(...managers), commonController.addStudentToClass);
router.delete('/classes/:id/students/:studentId', authorize(...managers), commonController.removeStudentFromClass);

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
router.delete('/schedules/:id', authorize(...managers), commonController.deleteTeacherSchedule);

// Donations
router.get('/donations', commonController.getAllDonations);
router.post('/donations', authorize(...managers), commonController.recordDonation);
router.get('/donations/report', commonController.getDonationReport);

// Expenditures - Only Expenditure Receptionist
router.post(
  '/expenditures',
  authorize('FINANCE_OFFICER', 'SUPER_ADMIN'),
  commonController.recordExpenditure
);
router.get('/expenditures', commonController.getAllExpenditures);
router.get('/expenditures/report', commonController.getExpenditureReport);

// Settings
router.post('/settings', authorize(...managers), commonController.updateSystemSetting);

export default router;
