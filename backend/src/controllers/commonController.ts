import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// Classes
export const getAllClasses = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

export const getClassById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true, schedules: true, exams: true },
        },
        students: {
          select: {
            id: true,
            fullName: true,
            admissionNumber: true,
            gender: true,
            status: true,
            profilePhoto: true,
          },
          orderBy: { admissionNumber: 'asc' },
        },
        schedules: {
          include: { teacher: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        exams: {
          orderBy: { examDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!classData) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
};

export const createClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, grade, section, capacity, academicYear } = req.body;

    let targetAcademicYear = academicYear;
    if (!targetAcademicYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      targetAcademicYear = activeYear?.year || new Date().getFullYear().toString();
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        grade: parseInt(grade),
        section,
        capacity: parseInt(capacity || '30'),
        academicYear: targetAcademicYear,
      },
    });

    res.status(201).json({ success: true, data: newClass });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A class with this name already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create class' });
  }
};

export const updateClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, grade, section, capacity, academicYear } = req.body;

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name,
        grade: grade ? parseInt(grade) : undefined,
        section,
        capacity: capacity ? parseInt(capacity) : undefined,
        academicYear,
      },
    });

    res.json({ success: true, data: updatedClass });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
};

export const deleteClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if class has students
    const studentCount = await prisma.student.count({
      where: { classId: id },
    });

    if (studentCount > 0) {
      res.status(400).json({ 
        error: 'Cannot delete class with assigned students. Please reassign students first.' 
      });
      return;
    }

    await prisma.class.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
};

export const getClassStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const students = await prisma.student.findMany({
      where: { classId: id },
      orderBy: { fullName: 'asc' },
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class students' });
  }
};

export const addStudentToClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: classId } = req.params;
    const { studentId } = req.body;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: { classId },
    });

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add student to class' });
  }
};

export const removeStudentFromClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    // We don't have an "Unassigned" class ID, so we might need a default one 
    // or set it to a specific value. Given the schema, classId is REQUIRED.
    // I will check if there is an "Unassigned" class already.
    
    let unassignedClass = await prisma.class.findFirst({
      where: { name: 'Unassigned' },
    });

    if (!unassignedClass) {
      // Create it if it doesn't exist
      const activeYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      unassignedClass = await prisma.class.create({
        data: {
          name: 'Unassigned',
          grade: 0,
          academicYear: activeYear?.year || new Date().getFullYear().toString(),
          capacity: 9999,
        }
      });
    }

    const student = await prisma.student.update({
      where: { id: studentId },
      data: { classId: unassignedClass.id },
    });

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove student from class' });
  }
};

// Exams
export const getAllExams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId, term, search, page = '1', limit = '50' } = req.query;
    const where: any = {};

    if (classId) where.classId = classId;
    if (term) where.term = term;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        include: { class: true },
        orderBy: { examDate: 'desc' },
        skip,
        take,
      }),
      prisma.exam.count({ where }),
    ]);

    res.json({
      success: true,
      data: exams,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

export const createExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let currentAcademicYear = req.body.academicYear;
    
    if (!currentAcademicYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      
      if (activeYear) {
        currentAcademicYear = activeYear.year;
      } else {
        const year = new Date().getFullYear();
        currentAcademicYear = `${year}-${year + 1}`;
      }
    }

    const exam = await prisma.exam.create({
      data: {
        ...req.body,
        examDate: new Date(req.body.examDate),
        academicYear: currentAcademicYear,
      },
      include: { class: true },
    });

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

export const enterExamMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const { marks } = req.body;

    const markRecords = await Promise.all(
      marks.map((m: any) =>
        prisma.examMark.upsert({
          where: {
            examId_studentId: {
              examId,
              studentId: m.studentId,
            },
          },
          update: {
            marksObtained: parseFloat(m.marksObtained),
            grade: m.grade,
            remarks: m.remarks,
            enteredBy: req.user!.id,
          },
          create: {
            examId,
            studentId: m.studentId,
            marksObtained: parseFloat(m.marksObtained),
            grade: m.grade,
            remarks: m.remarks,
            enteredBy: req.user!.id,
          },
        })
      )
    );

    res.status(201).json({ success: true, data: markRecords });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enter marks' });
  }
};

export const getExamMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;

    const marks = await prisma.examMark.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            admissionNumber: true,
          },
        },
      },
    });

    res.json({ success: true, data: marks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam marks' });
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
          orderBy: {
            marksObtained: 'desc',
          },
        },
      },
    });

    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam report' });
  }
};

// Inventory
export const getAllInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const inventory = await prisma.inventory.findMany({
      where,
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

export const updateInventoryStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.inventory.update({
      where: { id },
      data: req.body,
    });

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory stock' });
  }
};

export const getLowStockItems = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.inventory.findMany({
      where: {
        enableAlert: true,
        quantity: {
          lte: prisma.inventory.fields.minQuantity,
        },
      },
      orderBy: { quantity: 'asc' },
    });

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
};

// Teacher Schedule
export const assignTeacherSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schedule = await prisma.teacherSchedule.create({
      data: req.body,
      include: { teacher: true, class: true },
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign schedule' });
  }
};

export const getTeacherSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teacherId, classId, dayOfWeek } = req.query;
    const where: any = { isActive: true };
    
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;

    const schedules = await prisma.teacherSchedule.findMany({
      where,
      include: { teacher: true, class: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
};

export const deleteTeacherSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.teacherSchedule.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Schedule removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove schedule' });
  }
};

// Donations
export const getAllDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, type, startDate, endDate } = req.query;
    const where: any = {};

    if (type) where.donationType = type;
    if (search) {
      where.OR = [
        { donorName: { contains: search as string, mode: 'insensitive' } },
        { receiptNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }
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

    res.json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donations' });
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
        donorName: req.body.donorName,
        donorContact: req.body.donorContact || req.body.contactNumber,
        donorAddress: req.body.donorAddress || req.body.address,
        amount: req.body.amount,
        donationType: req.body.donationType,
        purpose: req.body.purpose,
        paymentMethod: req.body.paymentMethod || 'CASH',
        date: new Date(req.body.date || Date.now()),
        receiptNumber: req.body.receiptNumber || receiptNumber,
        remarks: req.body.remarks,
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

    const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

    res.json({
      success: true,
      data: donations,
      summary: { totalAmount, count: donations.length },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate donation report' });
  }
};

// Expenditures
export const getAllExpenditures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, category, startDate, endDate } = req.query;
    const where: any = {};

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { vendor: { contains: search as string, mode: 'insensitive' } },
        { billNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const expenditures = await prisma.expenditure.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: expenditures });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenditures' });
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

    const totalAmount = expenditures.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: expenditures,
      summary: { totalAmount, count: expenditures.length },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate expenditure report' });
  }
};
// System Settings
export const updateSystemSetting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update system setting' });
  }
};
