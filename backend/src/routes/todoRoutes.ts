import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as todoController from '../controllers/todoController';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

const managers: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), todoController.createTodo);
router.get('/', todoController.getAllTodos);
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), todoController.updateTodo);
router.patch('/:id/status', authorize(...managers), todoController.updateTodoStatus);
router.get('/:id/history', todoController.getTodoHistory);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), todoController.deleteTodo);

export default router;
