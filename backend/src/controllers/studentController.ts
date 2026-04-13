import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { uploadToCloudinary } from '../utils/cloudinary';

export const registerStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentData = req.body;
    console.log('DEBUG: Full req.body:', JSON.stringify(studentData, null, 2));
    console.log('DEBUG: Date of Birth received:', studentData.dateOfBirth);

    // Validate date strings
    const dob = new Date(studentData.dateOfBirth);
    if (isNaN(dob.getTime())) {
      res.status(400).json({ 
        success: false, 
        error: `Invalid date of birth provided: ${studentData.dateOfBirth}`,
        receivedBody: studentData 
      });
      return;
    }

    const admDate = studentData.admissionDate ? new Date(studentData.admissionDate) : new Date();
    if (isNaN(admDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid admission date provided' 
      });
      return;
    }

    // Generate admission number
    const lastStudent = await prisma.student.findFirst({
      orderBy: { admissionNumber: 'desc' },
    });

    const nextNumber = lastStudent 
      ? parseInt(lastStudent.admissionNumber.split('-')[1]) + 1
      : 1;
    
    const admissionNumber = `STD-${nextNumber.toString().padStart(5, '0')}`;

    const student = await prisma.student.create({
      data: {
        ...studentData,
        admissionNumber,
        dateOfBirth: dob,
        admissionDate: admDate,
      },
      include: {
        class: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error registering student:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to register student' });
    }
  }
};

export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId, status, search, page = '1', limit = '50' } = req.query;

    const where: any = {};
    
    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { admissionNumber: { contains: search as string, mode: 'insensitive' } },
        { nic: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
};

export const getStudentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        documents: true,
        feePayments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        attendance: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch student' });
    }
  }
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date strings to Date objects if present
    if (updateData.dateOfBirth) {
      const dob = new Date(updateData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        res.status(400).json({ success: false, error: 'Invalid date of birth provided' });
        return;
      }
      updateData.dateOfBirth = dob;
    }

    if (updateData.admissionDate) {
      const admDate = new Date(updateData.admissionDate);
      if (isNaN(admDate.getTime())) {
        res.status(400).json({ success: false, error: 'Invalid admission date provided' });
        return;
      }
      updateData.admissionDate = admDate;
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
      },
    });

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, error: 'Failed to update student' });
  }
};

export const uploadStudentDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    // Upload to cloud storage
    const fileUrl = await uploadToCloudinary(file, 'students');

    const document = await prisma.studentDocument.create({
      data: {
        studentId: id,
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

export const getStudentsByClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({
      success: true,
      data: students,
      total: students.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete - change status to INACTIVE
    await prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.json({
      success: true,
      message: 'Student deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
};
