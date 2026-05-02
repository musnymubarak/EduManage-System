import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as teacherController from '../controllers/teacherController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.post(
  '/',
  authorize(...managers),
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  teacherController.registerTeacher
);
router.get('/', teacherController.getAllTeachers);
router.get('/:id', teacherController.getTeacherById);
router.get('/:id/schedule', teacherController.getTeacherSchedule);
router.put('/:id', authorize(...managers), upload.fields([{ name: 'profilePhoto', maxCount: 1 }]), teacherController.updateTeacher);
router.post(
  '/:id/upload',
  authorize(...managers),
  upload.single('file'),
  teacherController.uploadTeacherDocument
);

// Memos
router.post('/:id/memos', authorize(...managers), teacherController.addTeacherMemo);
router.delete('/:id/memos/:memoId', authorize(...managers), teacherController.deleteTeacherMemo);

// Leaving
router.put('/:id/leave', authorize(...managers), teacherController.markTeacherAsLeft);

export default router;
