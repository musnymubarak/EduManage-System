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
    const monthlyFeeAmount = parseFloat(setting?.value || '2000');

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

    // 4. Get Payments for this month
    const payments = await prisma.feePayment.findMany({
      where: {
        feeType: 'MONTHLY',
        month: month as string,
      },
    });

    // 5. Combine and map to check status
    const data = students.map(student => {
      const payment = payments.find(p => p.studentId === student.id);
      
      let currentStatus = 'PENDING';
      let paidAmount = 0;
      let balance = monthlyFeeAmount;

      if (payment) {
        currentStatus = payment.status;
        paidAmount = payment.paidAmount;
        balance = payment.balance;
      }

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        className: student.class?.name || 'Unassigned',
        month: month,
        totalAmount: monthlyFeeAmount,
        paidAmount,
        balance,
        paymentStatus: currentStatus,
        paymentId: payment?.id || null,
      };
    });

    // 6. Filter by Status if provided
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
        totalExpectedAmount: data.length * monthlyFeeAmount,
        totalCollectedAmount: data.reduce((sum, d) => sum + d.paidAmount, 0),
        totalOutstandingAmount: data.reduce((sum, d) => sum + d.balance, 0)
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

