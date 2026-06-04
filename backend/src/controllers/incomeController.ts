import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { IncomeCategory, FeeType, Prisma } from '@prisma/client';

// Friendly labels for the unified income ledger
const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  DONATION: 'Donation',
  IFTAR_DONATION: 'Iftar Donation',
  FIXED_DEPOSIT_PROFIT: 'Fixed Deposit Profit',
  LAND_SHARE_RENT: 'Land Share & Rent',
  SOLAR_PANEL_PROFIT: 'Solar Panel Profit',
  ALMS_BOX: 'Alms Box',
  OTHER: 'Other Income',
};

const FEE_CATEGORY_LABELS: Record<FeeType, string> = {
  MONTHLY: 'Monthly Hostel Fee',
  EXAM: 'Exam Fee',
  ADMISSION: 'New Student Admission Fee',
  OTHER: 'Other Student Fee',
};

const INCOME_CATEGORIES = Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[];
const DONATION_CATEGORIES: IncomeCategory[] = ['DONATION', 'IFTAR_DONATION'];

interface NormalizedRow {
  id: string;
  source: 'FEE' | 'INCOME';
  category: string;
  categoryLabel: string;
  date: Date | null;
  amount: number;
  paymentMethod: string | null;
  payerName: string | null;
  description: string | null;
  receiptNumber: string | null;
  deletable: boolean;
}

// Builds an end-of-day Date so an inclusive `lte` on a bare YYYY-MM-DD includes that whole day
const endOfDay = (value: string): Date => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Unified income ledger: merges read-only student-fee collections (FeePayment)
 * with manually-recorded Income rows. Server-side filtered + summarized.
 */
export const getIncomeLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, paymentMethod, startDate, endDate, search } = req.query as Record<string, string | undefined>;

    const isFeeToken = !!category && category.startsWith('FEE_');
    const isIncomeToken = !!category && INCOME_CATEGORIES.includes(category as IncomeCategory);

    // When a specific category token is provided, only one source is relevant.
    const includeFees = !category || category === 'ALL' || isFeeToken;
    const includeIncome = !category || category === 'ALL' || isIncomeToken;

    const rows: NormalizedRow[] = [];

    // --- Student fees (read-only) ---
    if (includeFees) {
      const feeWhere: Prisma.FeePaymentWhereInput = { paidAmount: { gt: 0 } };

      if (isFeeToken) {
        feeWhere.feeType = category!.replace('FEE_', '') as FeeType;
      }
      if (paymentMethod) {
        feeWhere.paymentMethod = paymentMethod as any;
      }
      if (startDate || endDate) {
        feeWhere.paymentDate = {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: endOfDay(endDate) } : {}),
        };
      }
      if (search) {
        feeWhere.OR = [
          { receiptNumber: { contains: search, mode: 'insensitive' } },
          { student: { fullName: { contains: search, mode: 'insensitive' } } },
          { student: { admissionNumber: { contains: search, mode: 'insensitive' } } },
          { student: { indexNumber: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const fees = await prisma.feePayment.findMany({
        where: feeWhere,
        include: { student: { select: { fullName: true, admissionNumber: true, indexNumber: true } } },
      });

      for (const f of fees) {
        rows.push({
          id: f.id,
          source: 'FEE',
          category: `FEE_${f.feeType}`,
          categoryLabel: FEE_CATEGORY_LABELS[f.feeType],
          date: f.paymentDate ?? f.createdAt,
          amount: f.paidAmount,
          paymentMethod: f.paymentMethod,
          payerName: f.student?.fullName ?? null,
          description: f.remarks ?? null,
          receiptNumber: f.receiptNumber,
          deletable: false,
        });
      }
    }

    // --- Manual income records ---
    if (includeIncome) {
      const incomeWhere: Prisma.IncomeWhereInput = {};

      if (isIncomeToken) {
        incomeWhere.category = category as IncomeCategory;
      }
      if (paymentMethod) {
        incomeWhere.paymentMethod = paymentMethod as any;
      }
      if (startDate || endDate) {
        incomeWhere.date = {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: endOfDay(endDate) } : {}),
        };
      }
      if (search) {
        incomeWhere.OR = [
          { source: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { remarks: { contains: search, mode: 'insensitive' } },
          { receiptNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      const incomes = await prisma.income.findMany({ where: incomeWhere });

      for (const i of incomes) {
        rows.push({
          id: i.id,
          source: 'INCOME',
          category: i.category,
          categoryLabel: INCOME_CATEGORY_LABELS[i.category],
          date: i.date,
          amount: i.amount,
          paymentMethod: i.paymentMethod,
          payerName: i.source,
          description: i.description ?? i.remarks ?? null,
          receiptNumber: i.receiptNumber,
          deletable: true,
        });
      }
    }

    // Sort newest first (guard null dates)
    rows.sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0));

    // Summary subtotals
    const studentFeesTotal = rows
      .filter((r) => r.source === 'FEE')
      .reduce((sum, r) => sum + r.amount, 0);
    const donationsTotal = rows
      .filter((r) => r.source === 'INCOME' && DONATION_CATEGORIES.includes(r.category as IncomeCategory))
      .reduce((sum, r) => sum + r.amount, 0);
    const otherIncomeTotal = rows
      .filter((r) => r.source === 'INCOME' && !DONATION_CATEGORIES.includes(r.category as IncomeCategory))
      .reduce((sum, r) => sum + r.amount, 0);
    const grandTotal = studentFeesTotal + donationsTotal + otherIncomeTotal;

    res.json({
      success: true,
      data: rows,
      summary: {
        count: rows.length,
        grandTotal,
        studentFeesTotal,
        donationsTotal,
        otherIncomeTotal,
      },
    });
  } catch (error) {
    console.error('Error fetching income ledger:', error);
    res.status(500).json({ error: 'Failed to fetch income ledger' });
  }
};

// Generate the next INC- receipt number (ignores non-INC prefixes such as migrated DON- receipts)
const generateReceiptNumber = async (): Promise<string> => {
  const last = await prisma.income.findFirst({
    where: { receiptNumber: { startsWith: 'INC-' } },
    orderBy: { createdAt: 'desc' },
  });

  let nextNumber = 1;
  if (last && last.receiptNumber) {
    const parts = last.receiptNumber.split('-');
    if (parts.length > 1) {
      const lastNum = parseInt(parts[1]);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
  }
  return `INC-${nextNumber.toString().padStart(6, '0')}`;
};

export const recordIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, category, amount, paymentMethod, source, description, remarks } = req.body;

    if (!category || !INCOME_CATEGORIES.includes(category)) {
      throw new AppError('A valid income category is required', 400);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new AppError('A valid amount is required', 400);
    }

    if (category === 'OTHER' && !description?.trim()) {
      throw new AppError('Please specify a description for "Other Income"', 400);
    }

    const buildData = (receiptNumber: string) => ({
      date: date ? new Date(date) : new Date(),
      category: category as IncomeCategory,
      amount: numAmount,
      paymentMethod: paymentMethod || 'CASH',
      source: source?.trim() || null,
      description: description?.trim() || null,
      remarks: remarks?.trim() || null,
      receiptNumber,
      recordedBy: req.user!.id,
    });

    // Create with a one-time retry in case two concurrent requests collide on the unique receipt number
    let income;
    try {
      income = await prisma.income.create({ data: buildData(await generateReceiptNumber()) });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        income = await prisma.income.create({ data: buildData(await generateReceiptNumber()) });
      } else {
        throw e;
      }
    }

    res.status(201).json({ success: true, message: 'Income recorded successfully', data: income });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error recording income:', error);
      res.status(500).json({ error: 'Failed to record income' });
    }
  }
};

export const updateIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, category, amount, paymentMethod, source, description, remarks } = req.body;

    if (category && !INCOME_CATEGORIES.includes(category)) {
      throw new AppError('A valid income category is required', 400);
    }

    const effectiveCategory = category as IncomeCategory | undefined;
    if (effectiveCategory === 'OTHER' && description !== undefined && !description?.trim()) {
      throw new AppError('Please specify a description for "Other Income"', 400);
    }

    const income = await prisma.income.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        category: effectiveCategory,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        paymentMethod: paymentMethod || undefined,
        source: source !== undefined ? (source?.trim() || null) : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        remarks: remarks !== undefined ? (remarks?.trim() || null) : undefined,
      },
    });

    res.json({ success: true, message: 'Income updated successfully', data: income });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error updating income:', error);
      res.status(500).json({ error: 'Failed to update income' });
    }
  }
};

export const deleteIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.income.delete({ where: { id } });
    res.json({ success: true, message: 'Income record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete income record' });
  }
};
