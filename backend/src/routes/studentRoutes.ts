import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as studentController from '../controllers/studentController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

// Receptionist, Principal, Vice Principal, Super Admin can manage students
const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.post(
  '/',
  authorize(...managers),
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  studentController.registerStudent
);
router.get('/', studentController.getAllStudents);
router.get('/migration/preview', authorize(...managers), studentController.getMigrationPreview);
router.post('/migration/execute', authorize(...managers), studentController.executeMigration);
router.get('/class/:classId', studentController.getStudentsByClass);
router.get('/:id', studentController.getStudentById);
router.put(
  '/:id', 
  authorize(...managers), 
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  studentController.updateStudent
);
router.put('/:id/leave', authorize(...managers), studentController.markStudentAsLeft);
router.post(
  '/:id/upload',
  authorize(...managers),
  upload.single('file'),
  studentController.uploadStudentDocument
);
router.delete('/:id/documents/:documentId', authorize(...managers), studentController.deleteStudentDocument);
router.delete('/:id', authorize('SUPER_ADMIN'), studentController.deleteStudent);

// Medical History Routes
router.get('/:id/medical', studentController.getStudentMedicalHistory);
router.put('/:id/medical', authorize(...managers), studentController.upsertStudentMedicalHistory);

export default router;
