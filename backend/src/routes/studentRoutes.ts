import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as studentController from '../controllers/studentController';

const router = Router();

router.use(authenticateToken);

// Receptionist, Principal, Vice Principal, Super Admin can manage students
const studentManagers = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post('/', authorize(...studentManagers), studentController.registerStudent);
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
