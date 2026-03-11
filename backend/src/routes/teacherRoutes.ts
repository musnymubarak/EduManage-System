import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as teacherController from '../controllers/teacherController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post('/', authorize(...managers), teacherController.registerTeacher);
router.get('/', teacherController.getAllTeachers);
router.get('/:id', teacherController.getTeacherById);
router.get('/:id/schedule', teacherController.getTeacherSchedule);
router.put('/:id', authorize(...managers), teacherController.updateTeacher);
router.post(
  '/:id/upload',
  authorize(...managers),
  upload.single('file'),
  teacherController.uploadTeacherDocument
);

export default router;
