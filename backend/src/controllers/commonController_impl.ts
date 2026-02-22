# Add missing common controller implementation
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// This file contains additional controllers for common operations

export const getAllClasses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

export const createExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const exam = await prisma.exam.create({
      data: {
        ...req.body,
        examDate: new Date(req.body.examDate),
      },
    });
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

export const enterExamMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId, marks } = req.body;
    const created = await Promise.all(
      marks.map((mark: any) =>
        prisma.examMark.upsert({
          where: {
            examId_studentId: {
              examId,
              studentId: mark.studentId,
            },
          },
          update: {
            marksObtained: mark.marksObtained,
            grade: mark.grade,
            remarks: mark.remarks,
            enteredBy: req.user!.id,
          },
          create: {
            examId,
            studentId: mark.studentId,
            marksObtained: mark.marksObtained,
            grade: mark.grade,
            remarks: mark.remarks,
            enteredBy: req.user!.id,
          },
        })
      )
    );
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enter exam marks' });
  }
};

export const getExamReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        marks: {
          include: {
            student: true,
          },
        },
      },
    });
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate exam report' });
  }
};

export const getAllInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inventory = await prisma.inventory.findMany({
      orderBy: { itemName: 'asc' },
    });
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

export const addInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await prisma.inventory.create({
      data: req.body,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.inventory.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
};

export const getLowStockItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.$queryRaw`
      SELECT * FROM inventory WHERE quantity <= "minQuantity"
    `;
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
};

export const assignTeacherSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schedule = await prisma.teacherSchedule.create({
      data: req.body,
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign teacher schedule' });
  }
};

export const getTeacherSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teacherId, classId } = req.query;
    const where: any = { isActive: true };
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;

    const schedules = await prisma.teacherSchedule.findMany({
      where,
      include: {
        teacher: true,
        class: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
};

export const recordDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lastDonation = await prisma.donation.findFirst({
      where: { receiptNumber: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const nextNumber = lastDonation && lastDonation.receiptNumber
      ? parseInt(lastDonation.receiptNumber.split('-')[1]) + 1
      : 1;
    
    const receiptNumber = `DON-${nextNumber.toString().padStart(6, '0')}`;

    const donation = await prisma.donation.create({
      data: {
        ...req.body,
        receiptNumber,
        date: new Date(req.body.date || Date.now()),
        recordedBy: req.user!.id,
      },
    });
    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record donation' });
  }
};

export const getDonationReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const donations = await prisma.donation.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = donations.reduce((sum, d) => sum + d.amount, 0);

    res.json({
      success: true,
      data: donations,
      summary: { total, count: donations.length },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate donation report' });
  }
};

export const recordExpenditure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenditure = await prisma.expenditure.create({
      data: {
        ...req.body,
        date: new Date(req.body.date),
        recordedBy: req.user!.id,
      },
    });
    res.status(201).json({ success: true, data: expenditure });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record expenditure' });
  }
};

export const getExpenditureReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, category } = req.query;
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (category) where.category = category;

    const expenditures = await prisma.expenditure.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = expenditures.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: expenditures,
      summary: { total, count: expenditures.length },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate expenditure report' });
  }
};
