import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as staffController from '../controllers/staffController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post(
  '/',
  authorize(...managers),
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  staffController.registerStaff
);

router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.put(
  '/:id', 
  authorize(...managers), 
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]), 
  staffController.updateStaff
);

router.post('/:id/salaries', authorize(...managers), staffController.recordSalaryPayment);
router.post('/:id/duties', authorize(...managers), staffController.assignStaffDuty);
router.put('/:id/duties/:dutyId', authorize(...managers), staffController.updateDutyStatus);
router.delete('/:id/duties/:dutyId', authorize(...managers), staffController.deleteStaffDuty);

export default router;
