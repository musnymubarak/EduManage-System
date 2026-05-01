import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
// Refreshed prisma client relation logic

export const getAllFeePayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, search, status } = req.query;
    const where: any = {};

    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search as string, mode: 'insensitive' } },
        { student: { fullName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const payments = await prisma.feePayment.findMany({
      where,
      include: {
        student: {
          include: {
            class: true
          }
        },
        partialPayments: true
      },
      orderBy: { createdAt: 'desc' },
    });

    // Manual join for collector to avoid prisma client type mismatch issues
    const userIds = payments.map(p => p.collectedBy);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true }
    });

    const dataWithCollector = payments.map(p => ({
      ...p,
      collector: users.find(u => u.id === p.collectedBy) || { fullName: 'Staff' }
    }));

    res.json({ success: true, data: dataWithCollector });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fee payments' });
  }
};

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      studentId,
      feeType,
      amount,
      paidAmount,
      dueDate,
      paymentDate,
      paymentMethod,
      month,
      academicYear,
      remarks,
    } = req.body;

    const numAmount = parseFloat(amount);
    const numPaidAmount = parseFloat(paidAmount || '0');
    const balance = numAmount - numPaidAmount;
    const status = balance <= 0 ? 'PAID' : numPaidAmount > 0 ? 'PARTIAL' : 'PENDING';

    // Get current academic year if not provided
    let targetAcademicYear = academicYear;
    if (!targetAcademicYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      targetAcademicYear = activeYear?.year || new Date().getFullYear().toString();
    }

    // Generate receipt number
    let receiptNumber = null;
    if (numPaidAmount > 0) {
      const lastPayment = await prisma.feePayment.findFirst({
        where: { receiptNumber: { startsWith: 'RCP-' } },
        orderBy: { createdAt: 'desc' },
      });

      let nextNumber = 1;
      if (lastPayment && lastPayment.receiptNumber) {
        const parts = lastPayment.receiptNumber.split('-');
        if (parts.length > 1) {
          const lastNum = parseInt(parts[1]);
          if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
          }
        }
      }
      receiptNumber = `RCP-${nextNumber.toString().padStart(6, '0')}`;
    }

    const payment = await prisma.feePayment.create({
      data: {
        studentId,
        feeType,
        amount: numAmount,
        paidAmount: numPaidAmount,
        balance,
        status,
        dueDate: dueDate ? new Date(dueDate) : new Date(), // Default to now if missing
        paymentDate: paymentDate ? new Date(paymentDate) : (numPaidAmount > 0 ? new Date() : null),
        paymentMethod: paymentMethod || null,
        receiptNumber,
        month,
        academicYear: targetAcademicYear,
        remarks,
        collectedBy: req.user!.id,
        partialPayments: numPaidAmount > 0 ? {
          create: {
            amount: numPaidAmount,
            paymentDate: new Date(),
            paymentMethod: paymentMethod || 'CASH',
            collectedBy: req.user!.id,
            receiptNumber,
          },
        } : undefined,
      },
      include: {
        student: true,
        partialPayments: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

export const recordPartialPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { feePaymentId, amount, paymentMethod, remarks } = req.body;

    // Get the fee payment
    const feePayment = await prisma.feePayment.findUnique({
      where: { id: feePaymentId },
    });

    if (!feePayment) {
      throw new AppError('Fee payment not found', 404);
    }

    if (amount > feePayment.balance) {
      throw new AppError('Payment amount exceeds balance', 400);
    }

    // Generate receipt number
    const lastPayment = await prisma.partialPayment.findFirst({
      where: { receiptNumber: { startsWith: 'RCP-' } },
      orderBy: { createdAt: 'desc' },
    });

    let nextNumber = 1;
    if (lastPayment && lastPayment.receiptNumber) {
      const parts = lastPayment.receiptNumber.split('-');
      if (parts.length > 1) {
        const lastNum = parseInt(parts[1]);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }
    const receiptNumber = `RCP-${nextNumber.toString().padStart(6, '0')}`;

    // Create partial payment
    const partialPayment = await prisma.partialPayment.create({
      data: {
        feePaymentId,
        amount,
        paymentDate: new Date(),
        paymentMethod,
        receiptNumber,
        collectedBy: req.user!.id,
        remarks,
      },
    });

    // Update fee payment
    const newPaidAmount = feePayment.paidAmount + amount;
    const newBalance = feePayment.amount - newPaidAmount;
    const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

    await prisma.feePayment.update({
      where: { id: feePaymentId },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Partial payment recorded successfully',
      data: partialPayment,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to record partial payment' });
    }
  }
};

export const getStudentFeeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const feePayments = await prisma.feePayment.findMany({
      where: { studentId },
      include: {
        partialPayments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: feePayments,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fee history' });
  }
};

// Full month-by-month fee ledger for a specific student (includes missing months)
export const getStudentFeeLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    // 1. Get student details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // 2. Get fee setting
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'monthly_fee_amount' },
    });
    const monthlyFeeAmount = parseFloat(setting?.value || '13000');

    // 3. Get all monthly payments for this student
    const monthlyPayments = await prisma.feePayment.findMany({
      where: { studentId, feeType: 'MONTHLY' },
      orderBy: { month: 'asc' },
    });

    // 4. Get all other (non-monthly) payments
    const otherPayments = await prisma.feePayment.findMany({
      where: { studentId, feeType: { not: 'MONTHLY' } },
      orderBy: { createdAt: 'desc' },
    });

    // 5. Build month-by-month ledger from admission to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const admissionMonth = `${student.admissionDate.getFullYear()}-${String(student.admissionDate.getMonth() + 1).padStart(2, '0')}`;

    // Generate all months from admission to current
    const allMonths: string[] = [];
    const [sy, sm] = admissionMonth.split('-').map(Number);
    const [ey, em] = currentMonth.split('-').map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      allMonths.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }

    // Map payment records by month
    const paymentMap = new Map(monthlyPayments.map(p => [p.month, p]));

    const monthlyLedger = allMonths.map(monthStr => {
      const payment = paymentMap.get(monthStr);
      
      if (payment) {
        return {
          month: monthStr,
          expectedAmount: payment.amount,
          paidAmount: payment.paidAmount,
          balance: payment.balance,
          status: payment.status,
          paymentDate: payment.paymentDate,
          receiptNumber: payment.receiptNumber,
          paymentMethod: payment.paymentMethod,
          paymentId: payment.id,
        };
      } else {
        return {
          month: monthStr,
          expectedAmount: monthlyFeeAmount,
          paidAmount: 0,
          balance: monthlyFeeAmount,
          status: 'MISSING',
          paymentDate: null,
          receiptNumber: null,
          paymentMethod: null,
          paymentId: null,
        };
      }
    });

    // 6. Calculate summary
    const totalExpected = monthlyLedger.reduce((sum, m) => sum + m.expectedAmount, 0);
    const totalPaid = monthlyLedger.reduce((sum, m) => sum + m.paidAmount, 0);
    const totalBalance = monthlyLedger.reduce((sum, m) => sum + m.balance, 0);
    const paidMonths = monthlyLedger.filter(m => m.status === 'PAID').length;
    const missingMonths = monthlyLedger.filter(m => m.status === 'MISSING').length;
    const partialMonths = monthlyLedger.filter(m => m.status === 'PARTIAL').length;

    // Other fees summary
    const otherFeesPaid = otherPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const otherFeesBalance = otherPayments.reduce((sum, p) => sum + p.balance, 0);

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullName: student.fullName,
          admissionNumber: student.admissionNumber,
          className: student.class?.name || 'Unassigned',
          admissionDate: student.admissionDate,
        },
        monthlyFeeAmount,
        monthlyLedger,
        otherPayments,
        summary: {
          totalMonths: allMonths.length,
          paidMonths,
          missingMonths,
          partialMonths,
          totalExpected,
          totalPaid,
          totalBalance,
          otherFeesPaid,
          otherFeesBalance,
          grandTotalOwed: totalBalance + otherFeesBalance,
        }
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error fetching student fee ledger:', error);
      res.status(500).json({ error: 'Failed to fetch student fee ledger' });
    }
  }
};

export const getPendingPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId } = req.query;

    const where: any = {
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    };

    if (classId) {
      where.student = { classId };
    }

    const pendingPayments = await prisma.feePayment.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({
      success: true,
      data: pendingPayments,
      total: pendingPayments.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
};

export const getFeeReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, feeType } = req.query;

    const where: any = {};

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (feeType) {
      where.feeType = feeType;
    }

    const payments = await prisma.feePayment.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalBalance = payments.reduce((sum, p) => sum + p.balance, 0);

    res.json({
      success: true,
      data: payments,
      summary: {
        totalAmount,
        totalPaid,
        totalBalance,
        count: payments.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate fee report' });
  }
};

export const updateFeePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, paidAmount, paymentMethod, remarks, paymentDate } = req.body;

    const currentFee = await prisma.feePayment.findUnique({
      where: { id },
    });

    if (!currentFee) {
      throw new AppError('Fee payment not found', 404);
    }

    const numAmount = amount !== undefined ? parseFloat(amount) : currentFee.amount;
    const numPaidAmount = paidAmount !== undefined ? parseFloat(paidAmount) : currentFee.paidAmount;
    const balance = numAmount - numPaidAmount;
    const status = balance <= 0 ? 'PAID' : numPaidAmount > 0 ? 'PARTIAL' : 'PENDING';

    const updated = await prisma.feePayment.update({
      where: { id },
      data: {
        amount: numAmount,
        paidAmount: numPaidAmount,
        balance,
        status,
        paymentMethod: paymentMethod || currentFee.paymentMethod,
        remarks: remarks !== undefined ? remarks : currentFee.remarks,
        paymentDate: paymentDate ? new Date(paymentDate) : currentFee.paymentDate,
      },
      include: {
        student: true,
      }
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updated
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update payment' });
    }
  }
};

export const getMonthlyFeeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, classId, search, status } = req.query;

    if (!month) {
      throw new AppError('Month is required (YYYY-MM)', 400);
    }

    // 1. Get Monthly Fee Amount from Settings
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'monthly_fee_amount' },
    });
    const monthlyFeeAmount = parseFloat(setting?.value || '13000');

    // 2. Build Student Filter
    const studentWhere: any = {
      status: 'ACTIVE',
    };
    if (classId) {
      studentWhere.classId = classId;
    }
    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { admissionNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // 3. Get All Students
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        class: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const studentIds = students.map(s => s.id);

    // 4. Get current month payments (single indexed query)
    const currentMonthPayments = await prisma.feePayment.findMany({
      where: {
        studentId: { in: studentIds },
        feeType: 'MONTHLY',
        month: month as string,
      },
    });

    // 5. Get previous months arrears via DB aggregation (O(1) query instead of O(students×months) loop)
    // Groups by studentId: counts how many month records exist and sums remaining balances
    const prevAggs = await prisma.feePayment.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
        feeType: 'MONTHLY',
        month: { lt: month as string },  // YYYY-MM lexicographic comparison works correctly
      },
      _count: { id: true },
      _sum: { balance: true },
    });

    // Build a lookup map for O(1) access
    const prevAggsMap = new Map(prevAggs.map(a => [a.studentId, a]));

    // 6. Helper: count months between two YYYY-MM strings (exclusive of end)
    const countMonthsBetween = (startStr: string, endStr: string): number => {
      const [sy, sm] = startStr.split('-').map(Number);
      const [ey, em] = endStr.split('-').map(Number);
      return (ey - sy) * 12 + (em - sm);
    };

    // 7. Combine: O(n) in-memory pass
    const data = students.map(student => {
      // --- Current month ---
      const currentMonthPayment = currentMonthPayments.find(p => p.studentId === student.id);
      
      const effectiveAmount = currentMonthPayment ? currentMonthPayment.amount : monthlyFeeAmount;
      let currentStatus = 'PENDING';
      let paidAmount = 0;
      let currentBalance = effectiveAmount;

      if (currentMonthPayment) {
        currentStatus = currentMonthPayment.status;
        paidAmount = currentMonthPayment.paidAmount;
        currentBalance = currentMonthPayment.balance;
      }

      // --- Previous arrears (DB-aggregated) ---
      const admissionMonth = `${student.admissionDate.getFullYear()}-${String(student.admissionDate.getMonth() + 1).padStart(2, '0')}`;
      const expectedMonthCount = Math.max(0, countMonthsBetween(admissionMonth, month as string));
      
      const agg = prevAggsMap.get(student.id);
      const recordCount = agg?._count?.id || 0;
      const partialBalanceSum = agg?._sum?.balance || 0;  // Sum of remaining balances from partial/pending records (PAID records contribute 0)

      // Missing months = months with no record at all (fully unpaid)
      const missingMonths = Math.max(0, expectedMonthCount - recordCount);
      
      // Total arrears = fully missing months × current fee + leftover balances from partial payments
      const previousArrears = (missingMonths * monthlyFeeAmount) + partialBalanceSum;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        className: student.class?.name || 'Unassigned',
        month: month,
        totalAmount: effectiveAmount,
        paidAmount,
        balance: currentBalance,
        paymentStatus: currentStatus,
        paymentId: currentMonthPayment?.id || null,
        previousArrears,
        totalOutstanding: currentBalance + previousArrears,
      };
    });

    // 7. Filter by Status if provided
    let filteredData = data;
    if (status && status !== 'ALL') {
      filteredData = data.filter(item => item.paymentStatus === status);
    }

    res.json({
      success: true,
      data: filteredData,
      summary: {
        totalStudents: data.length,
        paid: data.filter(d => d.paymentStatus === 'PAID').length,
        partial: data.filter(d => d.paymentStatus === 'PARTIAL').length,
        pending: data.filter(d => d.paymentStatus === 'PENDING').length,
        totalExpectedAmount: data.reduce((sum, d) => sum + d.totalAmount, 0),
        totalCollectedAmount: data.reduce((sum, d) => sum + d.paidAmount, 0),
        totalOutstandingAmount: data.reduce((sum, d) => sum + d.balance, 0),
        totalArrears: data.reduce((sum, d) => sum + d.previousArrears, 0),
        grandTotalOutstanding: data.reduce((sum, d) => sum + d.totalOutstanding, 0)
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch monthly fee status' });
    }
  }
};

