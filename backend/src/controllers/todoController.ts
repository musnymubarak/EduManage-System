import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export const createTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, priority, assignedTo, category } = req.body;

    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        priority,
        category,
        createdBy: req.user!.id,
        assignedTo,
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    // Create history entry
    await prisma.todoHistory.create({
      data: {
        todoId: todo.id,
        action: 'CREATED',
        newValue: 'TODO',
        changedBy: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: todo,
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
};

export const getAllTodos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, assignedTo } = req.query;

    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;

    // Finance Officers only see their own assigned todos
    if (req.user!.role === 'FINANCE_OFFICER') {
      where.assignedTo = req.user!.id;
    }

    const todos = await prisma.todo.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: todos,
      total: todos.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
};

export const updateTodoStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const oldTodo = await prisma.todo.findUnique({
      where: { id },
    });

    const updatedData: any = { status };
    
    if (status === 'DONE') {
      updatedData.completedAt = new Date();
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: updatedData,
      include: {
        creator: {
          select: { id: true, fullName: true, role: true },
        },
        assignee: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Create history entry
    await prisma.todoHistory.create({
      data: {
        todoId: id,
        action: 'STATUS_CHANGED',
        oldValue: oldTodo?.status,
        newValue: status,
        changedBy: req.user!.id,
      },
    });

    res.json({
      success: true,
      message: 'Todo status updated successfully',
      data: todo,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo status' });
  }
};

export const getTodoHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDate, endDate, action } = req.query;

    const where: any = {};
    
    if (id) where.todoId = id;

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (action) where.action = action;

    const history = await prisma.todoHistory.findMany({
      where,
      include: {
        changer: {
          select: { id: true, fullName: true, role: true },
        },
        todo: {
          include: {
            creator: {
              select: { id: true, fullName: true, role: true },
            },
            assignee: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json({
      success: true,
      data: history,
      total: history.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todo history' });
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.todo.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
};

export const updateTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, priority, category, assignedTo } = req.body;

    const oldTodo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!oldTodo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        category,
        assignedTo,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, role: true },
        },
        assignee: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Create history entry for general update
    await prisma.todoHistory.create({
      data: {
        todoId: id,
        action: 'UPDATED',
        changedBy: req.user!.id,
      },
    });

    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: todo,
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
};
