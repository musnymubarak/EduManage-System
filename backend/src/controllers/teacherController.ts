import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { uploadToCloudinary } from '../utils/cloudinary';

export const registerTeacher = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { qualifications, ...teacherData } = req.body;

    // Validate date strings
    const dob = new Date(teacherData.dateOfBirth);
    if (isNaN(dob.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid date of birth provided' });
      return;
    }

    const joinedDate = teacherData.joinedDate ? new Date(teacherData.joinedDate) : new Date();
    if (isNaN(joinedDate.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid joined date provided' });
      return;
    }

    // Generate employee number
    const lastTeacher = await prisma.teacher.findFirst({
      orderBy: { employeeNumber: 'desc' },
    });

    const nextNumber = lastTeacher 
      ? parseInt(lastTeacher.employeeNumber.split('-')[1]) + 1
      : 1;
    
    const employeeNumber = `TCH-${nextNumber.toString().padStart(4, '0')}`;

    const teacher = await prisma.teacher.create({
      data: {
        ...teacherData,
        employeeNumber,
        dateOfBirth: dob,
        joinedDate: joinedDate,
        qualifications: {
          create: qualifications ? (typeof qualifications === 'string' ? JSON.parse(qualifications) : qualifications) : [],
        },
      },
      include: {
        qualifications: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      data: teacher,
    });
  } catch (error) {
    console.error('Error registering teacher:', error);
    res.status(500).json({ success: false, error: 'Failed to register teacher' });
  }
};

export const getAllTeachers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    const where: any = {};
    
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { employeeNumber: { contains: search as string, mode: 'insensitive' } },
        { nic: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        qualifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: teachers,
      total: teachers.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

export const getTeacherById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        qualifications: true,
        documents: true,
        schedules: {
          include: {
            class: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        attendance: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch teacher' });
    }
  }
};

export const updateTeacher = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { qualifications, ...updateData } = req.body;

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: updateData,
      include: {
        qualifications: true,
      },
    });

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update teacher' });
  }
};

export const getTeacherSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const schedules = await prisma.teacherSchedule.findMany({
      where: {
        teacherId: id,
        isActive: true,
      },
      include: {
        class: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // If date is provided, filter for that day
    if (date) {
      const dayOfWeek = new Date(date as string).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const todaySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
      
      res.json({
        success: true,
        data: todaySchedules,
      });
    } else {
      res.json({
        success: true,
        data: schedules,
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher schedule' });
  }
};

export const uploadTeacherDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileUrl = await uploadToCloudinary(file, 'teachers');

    const document = await prisma.teacherDocument.create({
      data: {
        teacherId: id,
        documentType,
        fileName: file.originalname,
        fileUrl,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
};
