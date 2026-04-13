import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as studentController from '../controllers/studentController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

// Receptionist, Principal, Vice Principal, Super Admin can manage students
const studentManagers: UserRole[] = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post(
  '/',
  authorize(...studentManagers),
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  studentController.registerStudent
);
router.get('/', studentController.getAllStudents);
router.get('/class/:classId', studentController.getStudentsByClass);
router.get('/:id', studentController.getStudentById);
router.put('/:id', authorize(...studentManagers), studentController.updateStudent);
router.post(
  '/:id/upload',
  authorize(...studentManagers),
  upload.single('file'),
  studentController.uploadStudentDocument
);
router.delete('/:id', authorize('SUPER_ADMIN'), studentController.deleteStudent);

export default router;
