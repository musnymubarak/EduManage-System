import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import * as todoController from '../controllers/todoController';

const router = Router();

router.use(authenticateToken);

const managers = ['RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPER_ADMIN'];

router.post('/', authorize('RECEPTIONIST', 'SUPER_ADMIN'), todoController.createTodo);
router.get('/', todoController.getAllTodos);
router.put('/:id', authorize(...managers), todoController.updateTodoStatus);
router.get('/history', todoController.getTodoHistory);
router.delete('/:id', authorize('SUPER_ADMIN'), todoController.deleteTodo);

export default router;
