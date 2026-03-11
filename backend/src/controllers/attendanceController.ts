import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export const markStudentAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId, date, attendanceData } = req.body;
    // attendanceData: [{ studentId, status, remarks }]

    const attendanceRecords = await Promise.all(
      attendanceData.map(async (record: any) => {
        return prisma.studentAttendance.upsert({
          where: {
            studentId_date: {
              studentId: record.studentId,
              date: new Date(date),
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            markedBy: req.user!.id,
          },
          create: {
            studentId: record.studentId,
            classId,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks,
            markedBy: req.user!.id,
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendanceRecords,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

export const markTeacherAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, attendanceData } = req.body;

    const attendanceRecords = await Promise.all(
      attendanceData.map(async (record: any) => {
        return prisma.teacherAttendance.upsert({
          where: {
            teacherId_date: {
              teacherId: record.teacherId,
              date: new Date(date),
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            markedBy: req.user!.id,
          },
          create: {
            teacherId: record.teacherId,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks,
            markedBy: req.user!.id,
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      message: 'Teacher attendance marked successfully',
      data: attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark teacher attendance' });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId, startDate, endDate } = req.query;

    const where: any = {};
    if (classId) where.classId = classId;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const attendance = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            fullName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({
      success: true,
      data: attendance,
      total: attendance.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const getAttendanceSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [studentPresent, studentTotal, teacherPresent, teacherTotal] = await Promise.all([
      prisma.studentAttendance.count({
        where: {
          date: today,
          status: 'PRESENT',
        },
      }),
      prisma.student.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.teacherAttendance.count({
        where: {
          date: today,
          status: 'PRESENT',
        },
      }),
      prisma.teacher.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        students: {
          present: studentPresent,
          total: studentTotal,
          percentage: studentTotal > 0 ? ((studentPresent / studentTotal) * 100).toFixed(1) : 0,
        },
        teachers: {
          present: teacherPresent,
          total: teacherTotal,
          percentage: teacherTotal > 0 ? ((teacherPresent / teacherTotal) * 100).toFixed(1) : 0,
        },
        date: today,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
};
