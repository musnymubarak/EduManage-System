import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// Classes
export const getAllClasses = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { academicYear } = _req.query;
    let yearFilter: string;

    if (academicYear) {
      yearFilter = academicYear as string;
    } else {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      yearFilter = activeYear?.year || new Date().getFullYear().toString();
    }

    const classes = await prisma.class.findMany({
      where: {
        academicYear: yearFilter,
      },
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
            indexNumber: true,
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
    const { name, grade, section, capacity, academicYear, subjects } = req.body;

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
        subjects: subjects || [],
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
    const { name, grade, section, capacity, academicYear, subjects } = req.body;

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name,
        grade: grade ? parseInt(grade) : undefined,
        section,
        capacity: capacity ? parseInt(capacity) : undefined,
        academicYear,
        subjects: subjects !== undefined ? subjects : undefined,
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
    const { classId, term, search, academicYear, page = '1', limit = '50' } = req.query;
    const where: any = {};

    if (academicYear) {
      where.academicYear = academicYear;
    }
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

    const { name, term, classId, subject, examDate, totalMarks, passingMarks, examFee } = req.body;

    // Find the selected class to check for sibling classes (same grade, different sections)
    const selectedClass = await prisma.class.findUnique({ where: { id: classId } });
    if (!selectedClass) {
      res.status(400).json({ error: 'Class not found' });
      return;
    }

    // Find sibling classes (same grade + academicYear, with sections like 10A, 10B)
    const siblingClasses = await prisma.class.findMany({
      where: {
        grade: selectedClass.grade,
        academicYear: currentAcademicYear,
        section: { not: null },
      },
    });

    // If the selected class has sections (siblings exist), create exam for all siblings
    // Otherwise create only for the selected class
    const targetClassIds = siblingClasses.length > 1
      ? siblingClasses.map((c) => c.id)
      : [classId];

    const examData = {
      name,
      term,
      subject,
      examDate: new Date(examDate),
      totalMarks: parseFloat(totalMarks),
      passingMarks: parseFloat(passingMarks),
      examFee: examFee ? parseFloat(examFee) : null,
      academicYear: currentAcademicYear,
    };

    const exams = await Promise.all(
      targetClassIds.map((cId) =>
        prisma.exam.create({
          data: { ...examData, classId: cId },
          include: { class: true },
        })
      )
    );

    res.status(201).json({ success: true, data: exams.length === 1 ? exams[0] : exams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

export const updateExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const { name, term, classId, subject, examDate, totalMarks, passingMarks, examFee } = req.body;

    const exam = await prisma.exam.update({
      where: { id: examId },
      data: {
        name,
        term,
        classId,
        subject,
        examDate: examDate ? new Date(examDate) : undefined,
        totalMarks: totalMarks !== undefined ? parseFloat(totalMarks) : undefined,
        passingMarks: passingMarks !== undefined ? parseFloat(passingMarks) : undefined,
        examFee: examFee !== undefined ? (examFee === null || examFee === '' ? null : parseFloat(examFee)) : undefined,
      },
      include: { class: true },
    });

    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam' });
  }
};

export const enterExamMarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;
    const { marks } = req.body;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    const invalidMark = marks.find((m: any) => parseFloat(m.marksObtained) > exam.totalMarks);
    if (invalidMark) {
      res.status(400).json({ error: `Marks obtained cannot exceed maximum marks of ${exam.totalMarks}` });
      return;
    }

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
            indexNumber: true,
            classId: true,
            class: { select: { name: true } },
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

export const deleteExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examId } = req.params;

    // Delete associated marks first
    await prisma.examMark.deleteMany({ where: { examId } });

    await prisma.exam.delete({ where: { id: examId } });

    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};

// Rankings
interface StudentAggregate {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  indexNumber: string | null;
  totalObtained: number;
  totalMax: number;
  subjectBreakdown: {
    examId: string;
    examName: string;
    subject: string;
    marksObtained: number;
    totalMarks: number;
    classHighest: number;
    classAverage: number;
    grade: string;
  }[];
}

function calculateGrade(marksObtained: number, totalMarks: number, passingMarks: number): string {
  const percentage = (marksObtained / totalMarks) * 100;
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 50) return 'C';
  if (marksObtained >= passingMarks) return 'S';
  return 'F';
}

function calculateOverallGrade(percentage: number): string {
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 35) return 'S';
  return 'F';
}

async function computeClassRankings(classId: string, term: string, academicYear: string) {
  const exams = await prisma.exam.findMany({
    where: { classId, term: term as any, academicYear },
    include: {
      marks: {
        include: {
          student: {
            select: { id: true, fullName: true, admissionNumber: true, indexNumber: true },
          },
        },
      },
    },
    orderBy: { subject: 'asc' },
  });

  if (exams.length === 0) return null;

  // Get all students in this class
  const classStudents = await prisma.student.findMany({
    where: { classId, status: 'ACTIVE' },
    select: { id: true, fullName: true, admissionNumber: true, indexNumber: true },
  });

  // Compute per-exam stats
  const examStats: Record<string, { highest: number; average: number }> = {};
  for (const exam of exams) {
    const markValues = exam.marks.map((m) => m.marksObtained);
    if (markValues.length > 0) {
      examStats[exam.id] = {
        highest: Math.max(...markValues),
        average: parseFloat((markValues.reduce((a, b) => a + b, 0) / markValues.length).toFixed(1)),
      };
    } else {
      examStats[exam.id] = { highest: 0, average: 0 };
    }
  }

  // Build per-student aggregates
  const studentMap: Record<string, StudentAggregate> = {};

  // Initialize all class students (missing exams = 0)
  for (const s of classStudents) {
    studentMap[s.id] = {
      studentId: s.id,
      studentName: s.fullName,
      admissionNumber: s.admissionNumber,
      indexNumber: s.indexNumber,
      totalObtained: 0,
      totalMax: 0,
      subjectBreakdown: [],
    };
  }

  // Populate marks
  for (const exam of exams) {
    const marksMap: Record<string, number> = {};
    for (const mark of exam.marks) {
      marksMap[mark.studentId] = mark.marksObtained;
    }

    for (const studentId of Object.keys(studentMap)) {
      const obtained = marksMap[studentId] ?? 0;
      studentMap[studentId].totalObtained += obtained;
      studentMap[studentId].totalMax += exam.totalMarks;
      studentMap[studentId].subjectBreakdown.push({
        examId: exam.id,
        examName: exam.name,
        subject: exam.subject,
        marksObtained: obtained,
        totalMarks: exam.totalMarks,
        classHighest: examStats[exam.id].highest,
        classAverage: examStats[exam.id].average,
        grade: calculateGrade(obtained, exam.totalMarks, exam.passingMarks),
      });
    }
  }

  // Sort by totalObtained DESC and assign dense ranks
  const sorted = Object.values(studentMap).sort((a, b) => b.totalObtained - a.totalObtained);
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].totalObtained < sorted[i - 1].totalObtained) {
      currentRank = i + 1;
    }
    (sorted[i] as any).rank = currentRank;
    (sorted[i] as any).percentage = sorted[i].totalMax > 0
      ? parseFloat(((sorted[i].totalObtained / sorted[i].totalMax) * 100).toFixed(1))
      : 0;
    (sorted[i] as any).overallGrade = calculateOverallGrade((sorted[i] as any).percentage);
  }

  return {
    classId,
    term,
    academicYear,
    totalExams: exams.length,
    totalStudents: sorted.length,
    rankings: sorted,
  };
}

export const getClassRankings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId, term, academicYear } = req.query;

    if (!classId || !term || !academicYear) {
      res.status(400).json({ error: 'classId, term, and academicYear are required' });
      return;
    }

    const cls = await prisma.class.findUnique({ where: { id: classId as string } });
    const rankings = await computeClassRankings(classId as string, term as string, academicYear as string);

    if (!rankings) {
      res.json({ success: true, data: { classId, className: cls?.name, term, academicYear, totalExams: 0, totalStudents: 0, rankings: [] } });
      return;
    }

    res.json({ success: true, data: { ...rankings, className: cls?.name } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute rankings' });
  }
};

export const getStudentRanking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    let yearFilter = academicYear as string;
    if (!yearFilter) {
      const activeYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      yearFilter = activeYear?.year || '';
    }

    const terms = ['FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM'];
    const termRankings = [];

    for (const term of terms) {
      const rankings = await computeClassRankings(student.classId, term, yearFilter);
      if (rankings && rankings.rankings.length > 0) {
        const studentEntry = rankings.rankings.find((r: any) => r.studentId === studentId);
        if (studentEntry) {
          termRankings.push({
            term,
            rank: (studentEntry as any).rank,
            totalStudents: rankings.totalStudents,
            totalMarksObtained: studentEntry.totalObtained,
            totalMaxMarks: studentEntry.totalMax,
            percentage: (studentEntry as any).percentage,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        studentId,
        classId: student.classId,
        className: student.class?.name,
        academicYear: yearFilter,
        rankings: termRankings,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute student ranking' });
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
    const { location, purchaseDate } = req.body;
    
    // 1. Generate Prefix from Location (first 3 letters, uppercase)
    const locPrefix = (location || 'GEN').substring(0, 3).toUpperCase();
    
    // 2. Count existing items with same location prefix for sequence
    const count = await prisma.inventory.count({
      where: {
        location: {
          startsWith: location?.substring(0, 3) || 'GEN',
          mode: 'insensitive'
        }
      }
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    
    // 3. Get Years
    const currentYear = new Date().getFullYear();
    const purchaseYear = purchaseDate ? new Date(purchaseDate).getFullYear() : currentYear;
    
    // 4. Construct Serial Number: SLAC/2026/LOC001/2024
    // Using 2026 as per user requirement, but ideally it should be dynamic
    const serialNumber = `SLAC/2026/${locPrefix}${sequence}/${purchaseYear}`;

    const item = await prisma.inventory.create({
      data: {
        ...req.body,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        serialNumber
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { purchaseDate, location, ...rest } = req.body;
    
    // Fetch current item to check if we need to generate serial number
    const currentItem = await prisma.inventory.findUnique({ where: { id } });
    if (!currentItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    let serialNumber = currentItem.serialNumber;

    // Regenerate serial number if location or purchaseDate changes, or if it was missing
    if (!serialNumber || location || purchaseDate) {
      const targetLocation = location || currentItem.location || 'GEN';
      const locPrefix = targetLocation.substring(0, 3).toUpperCase();
      
      const count = await prisma.inventory.count({
        where: {
          location: {
            startsWith: targetLocation.substring(0, 3),
            mode: 'insensitive'
          },
          id: { not: id } // Don't count itself
        }
      });
      
      const sequence = (count + 1).toString().padStart(3, '0');
      const currentYear = new Date().getFullYear();
      const pDate = purchaseDate ? new Date(purchaseDate) : currentItem.purchaseDate;
      const purchaseYear = pDate ? new Date(pDate).getFullYear() : currentYear;
      
      serialNumber = `SLAC/2026/${locPrefix}${sequence}/${purchaseYear}`;
    }

    const item = await prisma.inventory.update({
      where: { id },
      data: {
        ...rest,
        location,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        serialNumber
      },
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
};

export const deleteInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.inventory.delete({ where: { id } });

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory item' });
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

export const deleteDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.donation.delete({ where: { id } });

    res.json({ success: true, message: 'Donation record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete donation' });
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
    const { date, category, description, amount, vendor, billNumber, paymentMethod, remarks, bankAccountId, referenceNumber, referenceDate } = req.body;

    const expenditure = await prisma.expenditure.create({
      data: {
        date: new Date(date),
        category,
        description,
        amount: parseFloat(amount),
        vendor,
        billNumber,
        paymentMethod,
        remarks,
        bankAccountId: bankAccountId || null,
        recordedBy: req.user!.id,
      },
    });

    if (bankAccountId && (paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHEQUE')) {
      await prisma.bankTransaction.create({
        data: {
          bankAccountId,
          type: 'WITHDRAWAL',
          amount: parseFloat(amount),
          description: `Expenditure: ${category} - ${description}`,
          referenceNumber: referenceNumber || null,
          referenceDate: referenceDate ? new Date(referenceDate) : null,
          paymentMethod,
          relatedExpenditureId: expenditure.id,
          transactionDate: expenditure.date,
          recordedBy: req.user!.id,
          remarks: 'Auto-generated from Expenditure record',
        }
      });
    }

    res.status(201).json({ success: true, data: expenditure });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record expenditure' });
  }
};

export const deleteExpenditure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.bankTransaction.deleteMany({ where: { relatedExpenditureId: id } });
    await prisma.expenditure.delete({ where: { id } });

    res.json({ success: true, message: 'Expenditure record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expenditure' });
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
