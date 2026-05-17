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
    const partialPaymentsMonth = await prisma.partialPayment.findMany({
      where: {
        paymentDate: {
          gte: firstDayOfMonth,
        },
      },
    });

    const monthlyFeeCollection = partialPaymentsMonth.reduce((sum, p) => sum + p.amount, 0);

    // Get urgent todos count
    const urgentTodos = await prisma.todo.count({
      where: {
        status: { not: 'DONE' },
        priority: 'URGENT',
      },
    });

    // --- NEW ENHANCEMENTS ---

    // 1. Top 3 Priority Todos
    const allPendingTodos = await prisma.todo.findMany({
      where: { status: { not: 'DONE' } },
      select: { id: true, title: true, priority: true, status: true, createdAt: true },
    });
    
    const priorityWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const topTodos = allPendingTodos
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3);

    // 2. Fee Collection Status (Donut Chart)
    const feeStatusCountsRaw = await prisma.feePayment.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const feeStatusCounts = feeStatusCountsRaw.map(item => ({
      name: item.status,
      value: item._count.status,
    }));

    // 3. Financial Trend (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [recentFees, recentDonations, recentExpenditures] = await Promise.all([
      prisma.partialPayment.findMany({
        where: { paymentDate: { gte: sixMonthsAgo } },
        select: { paymentDate: true, amount: true }
      }),
      prisma.donation.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { date: true, amount: true }
      }),
      prisma.expenditure.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { date: true, amount: true }
      })
    ]);

    const financialTrendMap = new Map<string, { name: string, income: number, expense: number }>();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('en-US', { month: 'short' });
      financialTrendMap.set(key, { name, income: 0, expense: 0 });
    }

    recentFees.forEach(f => {
      if (!f.paymentDate) return;
      const key = `${f.paymentDate.getFullYear()}-${String(f.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      if (financialTrendMap.has(key)) financialTrendMap.get(key)!.income += f.amount;
    });
    recentDonations.forEach(d => {
      const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      if (financialTrendMap.has(key)) financialTrendMap.get(key)!.income += d.amount;
    });
    recentExpenditures.forEach(e => {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      if (financialTrendMap.has(key)) financialTrendMap.get(key)!.expense += e.amount;
    });

    const financialTrends = Array.from(financialTrendMap.values());

    // 4. Weekly Attendance Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [studentAtt, teacherAtt] = await Promise.all([
      prisma.studentAttendance.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { date: true, status: true }
      }),
      prisma.teacherAttendance.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { date: true, status: true }
      })
    ]);

    const attendanceTrendMap = new Map<string, { date: string, studentPercentage: number, teacherPercentage: number }>();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const shortDate = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const sDay = studentAtt.filter(a => a.date.toISOString().split('T')[0] === dateStr);
      const sPresent = sDay.filter(a => a.status === 'PRESENT').length;
      const sPercentage = sDay.length > 0 ? (sPresent / sDay.length) * 100 : 0;

      const tDay = teacherAtt.filter(a => a.date.toISOString().split('T')[0] === dateStr);
      const tPresent = tDay.filter(a => a.status === 'PRESENT').length;
      const tPercentage = tDay.length > 0 ? (tPresent / tDay.length) * 100 : 0;

      attendanceTrendMap.set(dateStr, {
        date: shortDate,
        studentPercentage: Math.round(sPercentage),
        teacherPercentage: Math.round(tPercentage)
      });
    }

    const attendanceTrends = Array.from(attendanceTrendMap.values());

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
        topTodos,
        feeStatusCounts,
        financialTrends,
        attendanceTrends,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
