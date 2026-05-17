import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as academicYearController from '../controllers/academicYearController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', academicYearController.getAllAcademicYears);
router.post('/', authorize(...managers), academicYearController.createAcademicYear);
router.put('/:id', authorize(...managers), academicYearController.updateAcademicYear);
router.delete('/:id', authorize(...managers), academicYearController.deleteAcademicYear);
router.put('/:id/set-current', authorize(...managers), academicYearController.setCurrentAcademicYear);

export default router;
