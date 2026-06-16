import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { IncomeCategory, FeeType, ExpenditureCategory } from '@prisma/client';

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

const EXPENDITURE_CATEGORY_LABELS: Record<ExpenditureCategory, string> = {
  COOKING: 'Food & Bevarages',
  ADMINISTRATION: 'Administration',
  DEVELOPMENT: 'Development',
  OTHERS: 'Others',
};

export const getMonthlyBalanceSheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month } = req.query as Record<string, string | undefined>;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const defaultMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const selectedMonth = (month && /^\d{4}-\d{2}$/.test(month)) ? month : defaultMonthStr;

    const [year, m] = selectedMonth.split('-').map(Number);
    
    // Bounds in UTC to prevent timezone offset discrepancies
    const startDate = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

    // Get month label like "June 2026"
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[m - 1]} ${year}`;

    // 1. Fetch Student Fee Payments
    const feePayments = await prisma.feePayment.findMany({
      where: {
        paidAmount: { gt: 0 },
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: {
          select: {
            fullName: true,
            admissionNumber: true,
            indexNumber: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    // 2. Fetch Income Records
    const incomes = await prisma.income.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });

    // 3. Fetch Expenditure Records
    const expenditures = await prisma.expenditure.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });


    const prevYear = m === 1 ? year - 1 : year;
    const prevM = m === 1 ? 12 : m - 1;
    const prevStartDate = new Date(Date.UTC(prevYear, prevM - 1, 1, 0, 0, 0, 0));
    const prevEndDate = new Date(Date.UTC(prevYear, prevM, 0, 23, 59, 59, 999));

    const [prevFeePayments, prevIncomes, prevExpenditures] = await Promise.all([
      prisma.feePayment.findMany({
        where: {
          paidAmount: { gt: 0 },
          paymentDate: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
        select: { paidAmount: true },
      }),
      prisma.income.findMany({
        where: {
          date: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
        select: { amount: true },
      }),
      prisma.expenditure.findMany({
        where: {
          date: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
        select: { amount: true },
      }),
    ]);

    const prevTotalIncome = prevFeePayments.reduce((sum, f) => sum + f.paidAmount, 0) +
                            prevIncomes.reduce((sum, i) => sum + i.amount, 0);
    const prevTotalExpenditure = prevExpenditures.reduce((sum, e) => sum + e.amount, 0);
    const prevNetBalance = prevTotalIncome - prevTotalExpenditure;

    // --- Process Income ---
    const studentFeesBreakdown = {
      total: 0,
      monthly: 0,
      exam: 0,
      admission: 0,
      other: 0,
    };

    const donationsBreakdown = {
      total: 0,
      donation: 0,
      iftarDonation: 0,
    };

    const otherIncomeBreakdown = {
      total: 0,
      fixedDepositProfit: 0,
      landShareRent: 0,
      solarPanelProfit: 0,
      almsBox: 0,
      other: 0,
    };

    const incomeTransactions: any[] = [];

    // Map fee payments to transactions and update breakdown
    for (const f of feePayments) {
      studentFeesBreakdown.total += f.paidAmount;
      if (f.feeType === 'MONTHLY') studentFeesBreakdown.monthly += f.paidAmount;
      else if (f.feeType === 'EXAM') studentFeesBreakdown.exam += f.paidAmount;
      else if (f.feeType === 'ADMISSION') studentFeesBreakdown.admission += f.paidAmount;
      else if (f.feeType === 'OTHER') studentFeesBreakdown.other += f.paidAmount;

      incomeTransactions.push({
        id: f.id,
        date: f.paymentDate || f.createdAt,
        source: 'FEE',
        category: `FEE_${f.feeType}`,
        categoryLabel: FEE_CATEGORY_LABELS[f.feeType] || 'Student Fee',
        amount: f.paidAmount,
        paymentMethod: f.paymentMethod || 'CASH',
        payerName: f.student?.fullName || null,
        description: f.remarks || null,
        receiptNumber: f.receiptNumber || null,
      });
    }

    // Map incomes to transactions and update breakdown
    for (const i of incomes) {
      const amount = i.amount;
      if (i.category === 'DONATION') {
        donationsBreakdown.donation += amount;
        donationsBreakdown.total += amount;
      } else if (i.category === 'IFTAR_DONATION') {
        donationsBreakdown.iftarDonation += amount;
        donationsBreakdown.total += amount;
      } else {
        otherIncomeBreakdown.total += amount;
        if (i.category === 'FIXED_DEPOSIT_PROFIT') otherIncomeBreakdown.fixedDepositProfit += amount;
        else if (i.category === 'LAND_SHARE_RENT') otherIncomeBreakdown.landShareRent += amount;
        else if (i.category === 'SOLAR_PANEL_PROFIT') otherIncomeBreakdown.solarPanelProfit += amount;
        else if (i.category === 'ALMS_BOX') otherIncomeBreakdown.almsBox += amount;
        else if (i.category === 'OTHER') otherIncomeBreakdown.other += amount;
      }

      incomeTransactions.push({
        id: i.id,
        date: i.date,
        source: 'INCOME',
        category: i.category,
        categoryLabel: INCOME_CATEGORY_LABELS[i.category] || 'Manual Income',
        amount: i.amount,
        paymentMethod: i.paymentMethod,
        payerName: i.source || null,
        description: i.description || i.remarks || null,
        receiptNumber: i.receiptNumber || null,
      });
    }

    // Sort income transactions newest first
    incomeTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIncome = studentFeesBreakdown.total + donationsBreakdown.total + otherIncomeBreakdown.total;

    // --- Process Expenditures ---
    const expenditureBreakdown = {
      cooking: 0,
      administration: 0,
      development: 0,
      others: 0,
    };

    const expenditureTransactions: any[] = [];

    for (const e of expenditures) {
      const amount = e.amount;
      if (e.category === 'COOKING') expenditureBreakdown.cooking += amount;
      else if (e.category === 'ADMINISTRATION') expenditureBreakdown.administration += amount;
      else if (e.category === 'DEVELOPMENT') expenditureBreakdown.development += amount;
      else if (e.category === 'OTHERS') expenditureBreakdown.others += amount;

      expenditureTransactions.push({
        id: e.id,
        date: e.date,
        category: e.category,
        categoryLabel: EXPENDITURE_CATEGORY_LABELS[e.category] || 'Expenditure',
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        vendor: e.vendor || null,
        billNumber: e.billNumber || null,
        description: e.description,
        remarks: e.remarks || null,
      });
    }

    // Sort expenditure transactions newest first
    expenditureTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalExpenditure = expenditureBreakdown.cooking + expenditureBreakdown.administration + expenditureBreakdown.development + expenditureBreakdown.others;

    const netBalance = totalIncome - totalExpenditure;

    res.json({
      success: true,
      data: {
        month: selectedMonth,
        monthLabel,
        income: {
          total: totalIncome,
          breakdown: {
            studentFees: studentFeesBreakdown,
            donations: donationsBreakdown,
            otherIncome: otherIncomeBreakdown,
          },
          transactions: incomeTransactions,
        },
        expenditure: {
          total: totalExpenditure,
          breakdown: expenditureBreakdown,
          transactions: expenditureTransactions,
        },
        netBalance,
        previousMonthNetGain: prevNetBalance,
      },
    });
  } catch (error) {
    console.error('Error fetching monthly balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch monthly balance sheet' });
  }
};
