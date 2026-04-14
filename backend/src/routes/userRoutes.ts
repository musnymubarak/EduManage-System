import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as userController from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// List and Get operations allowed for management roles
router.get('/', authorize('SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'), userController.getAllUsers);
router.get('/:id', authorize('SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'), userController.getUserById);

// Write operations restricted to SUPER_ADMIN
router.use(authorize('SUPER_ADMIN'));

router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUser);
router.post('/:id/reset-password', userController.resetUserPassword);
router.patch('/:id/password', userController.resetUserPassword);
router.delete('/:id', userController.deactivateUser);

export default router;
