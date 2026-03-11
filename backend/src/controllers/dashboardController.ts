import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get counts
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      activeStudents,
      activeTeachers,
      studentAttendanceToday,
      teacherAttendanceToday,
      pendingFees,
      todayTodos,
      lowStockItems,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.teacher.count({ where: { status: 'ACTIVE' } }),
      prisma.studentAttendance.count({
        where: {
          date: today,
          status: 'PRESENT',
        },
      }),
      prisma.teacherAttendance.count({
        where: {
          date: today,
          status: 'PRESENT',
        },
      }),
      prisma.feePayment.count({
        where: {
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
      }),
      prisma.todo.count({
        where: {
          status: { not: 'DONE' },
        },
      }),
      prisma.inventory.count({
        where: {
          quantity: {
            lte: prisma.inventory.fields.minQuantity,
          },
        },
      }),
    ]);

    // Get recent activities
    const recentAdmissions = await prisma.student.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        admissionNumber: true,
        fullName: true,
        createdAt: true,
        class: {
          select: { name: true },
        },
      },
    });

    // Get fee collection summary for current month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const feePayments = await prisma.feePayment.findMany({
      where: {
        paymentDate: {
          gte: firstDayOfMonth,
          lte: today,
        },
      },
    });

    const monthlyFeeCollection = feePayments.reduce((sum, p) => sum + p.paidAmount, 0);

    // Get pending todos by priority
    const urgentTodos = await prisma.todo.count({
      where: {
        status: { not: 'DONE' },
        priority: 'URGENT',
      },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalClasses,
          activeStudents,
          activeTeachers,
        },
        todayAttendance: {
          students: {
            present: studentAttendanceToday,
            total: activeStudents,
            percentage: activeStudents > 0 
              ? ((studentAttendanceToday / activeStudents) * 100).toFixed(1)
              : 0,
          },
          teachers: {
            present: teacherAttendanceToday,
            total: activeTeachers,
            percentage: activeTeachers > 0
              ? ((teacherAttendanceToday / activeTeachers) * 100).toFixed(1)
              : 0,
          },
        },
        financial: {
          pendingFees,
          monthlyCollection: monthlyFeeCollection,
        },
        alerts: {
          todos: todayTodos,
          urgentTodos,
          lowStockItems,
        },
        recentAdmissions,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
