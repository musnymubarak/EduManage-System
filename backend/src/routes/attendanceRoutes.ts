import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as attendanceController from '../controllers/attendanceController';

const router = Router();

router.use(authenticateToken);

const managers = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post('/students', authorize(...managers), attendanceController.markStudentAttendance);
router.post('/teachers', authorize(...managers), attendanceController.markTeacherAttendance);
router.get('/students', attendanceController.getStudentAttendance);
router.get('/summary', attendanceController.getAttendanceSummary);

export default router;
