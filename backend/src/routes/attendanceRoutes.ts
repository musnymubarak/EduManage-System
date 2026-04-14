import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as attendanceController from '../controllers/attendanceController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.post('/students', authorize(...managers), attendanceController.markStudentAttendance);
router.post('/teachers', authorize(...managers), attendanceController.markTeacherAttendance);
router.post('/staff', authorize(...managers), attendanceController.markStaffAttendance);

router.get('/students', attendanceController.getStudentAttendance);
router.get('/staff', attendanceController.getStaffAttendance);
router.get('/summary', attendanceController.getAttendanceSummary);

export default router;
