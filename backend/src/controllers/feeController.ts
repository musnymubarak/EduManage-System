import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

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

    const balance = amount - paidAmount;
    const status = balance === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

    // Generate receipt number
    const lastPayment = await prisma.feePayment.findFirst({
      where: { receiptNumber: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const nextNumber = lastPayment && lastPayment.receiptNumber
      ? parseInt(lastPayment.receiptNumber.split('-')[1]) + 1
      : 1;
    
    const receiptNumber = `RCP-${nextNumber.toString().padStart(6, '0')}`;

    const payment = await prisma.feePayment.create({
      data: {
        studentId,
        feeType,
        amount,
        paidAmount,
        balance,
        status,
        dueDate: new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod,
        receiptNumber: paidAmount > 0 ? receiptNumber : null,
        month,
        academicYear,
        remarks,
        collectedBy: req.user!.id,
        partialPayments: paidAmount > 0 ? {
          create: {
            amount: paidAmount,
            paymentDate: new Date(paymentDate || Date.now()),
            paymentMethod,
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
      orderBy: { createdAt: 'desc' },
    });

    const nextNumber = lastPayment && lastPayment.receiptNumber
      ? parseInt(lastPayment.receiptNumber.split('-')[1]) + 1
      : 1;
    
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
