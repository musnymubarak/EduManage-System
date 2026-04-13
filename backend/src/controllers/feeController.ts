import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

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
        student: true,
        partialPayments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payments });
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
