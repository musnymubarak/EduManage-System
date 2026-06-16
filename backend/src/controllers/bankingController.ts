import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { BankAccountType, BankTransactionType, PaymentMethod, Prisma } from '@prisma/client';

export const getAllBankAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;
    
    const accounts = await prisma.bankAccount.findMany({
      where: includeInactive === 'true' ? {} : { isActive: true },
      orderBy: { accountName: 'asc' },
    });

    // Compute balance for each
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const deposits = await prisma.bankTransaction.aggregate({
          where: { bankAccountId: account.id, type: { in: ['DEPOSIT', 'TRANSFER_IN'] } },
          _sum: { amount: true },
        });
        const withdrawals = await prisma.bankTransaction.aggregate({
          where: { bankAccountId: account.id, type: { in: ['WITHDRAWAL', 'TRANSFER_OUT'] } },
          _sum: { amount: true },
        });

        const currentBalance = account.openingBalance + (deposits._sum.amount || 0) - (withdrawals._sum.amount || 0);

        return {
          ...account,
          currentBalance,
        };
      })
    );

    res.json({ success: true, data: accountsWithBalance });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
};

export const createBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accountName, bankName, accountNumber, branch, accountType, openingBalance, remarks } = req.body;

    if (!accountName || !bankName || !accountNumber || !accountType) {
      throw new AppError('Required fields are missing', 400);
    }

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { accountNumber },
    });

    if (existingAccount) {
      throw new AppError('Account number already exists', 400);
    }

    const account = await prisma.bankAccount.create({
      data: {
        accountName,
        bankName,
        accountNumber,
        branch,
        accountType: accountType as BankAccountType,
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
        remarks,
      },
    });

    res.status(201).json({ success: true, message: 'Bank account created successfully', data: account });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ error: error.message });
    else {
      console.error('Error creating bank account:', error);
      res.status(500).json({ error: 'Failed to create bank account' });
    }
  }
};

export const updateBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { accountName, bankName, branch, accountType, remarks, isActive } = req.body;

    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        accountName,
        bankName,
        branch,
        accountType: accountType as BankAccountType,
        remarks,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({ success: true, message: 'Bank account updated successfully', data: account });
  } catch (error) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
};

export const deactivateBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Bank account deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate bank account' });
  }
};

export const getAccountTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDate, endDate, type, paymentMethod } = req.query as Record<string, string | undefined>;

    const whereClause: Prisma.BankTransactionWhereInput = { bankAccountId: id };

    if (startDate || endDate) {
      whereClause.transactionDate = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    if (type) whereClause.type = type as BankTransactionType;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod as PaymentMethod;

    const transactions = await prisma.bankTransaction.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' },
    });

    const mappedTransactions = transactions.map(t => ({
      ...t,
      deletable: !t.relatedIncomeId && !t.relatedExpenditureId && !t.transferAccountId,
    }));

    res.json({ success: true, data: mappedTransactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const recordTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bankAccountId, type, amount, description, referenceNumber, referenceDate, paymentMethod, remarks, transactionDate } = req.body;

    if (!bankAccountId || !type || !amount || !description || !paymentMethod) {
      throw new AppError('Required fields are missing', 400);
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) throw new AppError('Amount must be positive', 400);

    const account = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!account || !account.isActive) {
      throw new AppError('Bank account not found or inactive', 400);
    }

    let proofUrl = null;
    if (req.file) {
      proofUrl = await uploadToCloudinary(req.file, 'banking/proofs');
    }

    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        type: type as BankTransactionType,
        amount: parsedAmount,
        description,
        referenceNumber: referenceNumber || null,
        referenceDate: referenceDate ? new Date(referenceDate) : null,
        paymentMethod: paymentMethod as PaymentMethod,
        proofUrl,
        remarks: remarks || null,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
        recordedBy: req.user!.id,
      },
    });

    res.status(201).json({ success: true, message: 'Transaction recorded successfully', data: transaction });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to record transaction' });
  }
};

export const transferBetweenAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromAccountId, toAccountId, amount, description, referenceNumber, transactionDate, remarks } = req.body;

    if (!fromAccountId || !toAccountId || !amount || !description) {
      throw new AppError('Required fields are missing', 400);
    }

    if (fromAccountId === toAccountId) {
      throw new AppError('Source and target accounts must be different', 400);
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) throw new AppError('Amount must be positive', 400);

    await prisma.$transaction(async (tx) => {
      // We don't check balances strictly here (could be overdrawn), but we verify accounts exist
      const sourceAccount = await tx.bankAccount.findUnique({ where: { id: fromAccountId } });
      const targetAccount = await tx.bankAccount.findUnique({ where: { id: toAccountId } });

      if (!sourceAccount || !sourceAccount.isActive) throw new AppError('Source account invalid', 400);
      if (!targetAccount || !targetAccount.isActive) throw new AppError('Target account invalid', 400);

      // We need to create both and link them logically, but schema only has `transferAccountId` which is enough
      await tx.bankTransaction.create({
        data: {
          bankAccountId: fromAccountId,
          type: 'TRANSFER_OUT',
          amount: parsedAmount,
          description,
          referenceNumber: referenceNumber || null,
          paymentMethod: 'BANK_TRANSFER',
          transferAccountId: toAccountId,
          remarks: remarks || null,
          transactionDate: transactionDate ? new Date(transactionDate) : undefined,
          recordedBy: req.user!.id,
        },
      });

      await tx.bankTransaction.create({
        data: {
          bankAccountId: toAccountId,
          type: 'TRANSFER_IN',
          amount: parsedAmount,
          description,
          referenceNumber: referenceNumber || null,
          paymentMethod: 'BANK_TRANSFER',
          transferAccountId: fromAccountId,
          remarks: remarks || null,
          transactionDate: transactionDate ? new Date(transactionDate) : undefined,
          recordedBy: req.user!.id,
        },
      });
    });

    res.status(201).json({ success: true, message: 'Transfer successful' });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to process transfer' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tx = await prisma.bankTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError('Transaction not found', 404);

    if (tx.relatedIncomeId || tx.relatedExpenditureId || tx.transferAccountId) {
      throw new AppError('Cannot manually delete auto-linked transaction or transfer. Delete the parent record instead.', 400);
    }

    if (tx.proofUrl) {
      await deleteFromCloudinary(tx.proofUrl);
    }

    await prisma.bankTransaction.delete({ where: { id } });
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ error: error.message });
    else res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

export const getMonthlyBankingSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Current month first day and last day
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const deposits = await prisma.bankTransaction.aggregate({
      where: {
        transactionDate: { gte: firstDay, lte: lastDay },
        type: { in: ['DEPOSIT', 'TRANSFER_IN'] },
      },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.bankTransaction.aggregate({
      where: {
        transactionDate: { gte: firstDay, lte: lastDay },
        type: { in: ['WITHDRAWAL', 'TRANSFER_OUT'] },
      },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        monthlyDeposits: deposits._sum.amount || 0,
        monthlyWithdrawals: withdrawals._sum.amount || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
};
