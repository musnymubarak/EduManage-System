import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as userController from '../controllers/userController';

const router = Router();

// All routes require authentication and SUPER_ADMIN role
router.use(authenticateToken);
router.use(authorize('SUPER_ADMIN'));

router.post('/', userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.patch('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUser);
router.post('/:id/reset-password', userController.resetUserPassword);
router.patch('/:id/password', userController.resetUserPassword);
router.delete('/:id', userController.deactivateUser);

export default router;
