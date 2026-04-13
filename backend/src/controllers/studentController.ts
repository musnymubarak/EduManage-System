import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';

export const registerStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const uploadedUrls: string[] = [];
  try {
    const { ...studentData } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Filter fields to match Prisma schema
    const {
      fullName, nameWithInitials, gender, bloodGroup, religion, ethnicity, 
      nationality, nic, birthCertificateNo, address, city, district, 
      province, postalCode, mobileNumber, homePhone, email, classId,
      admissionDate, previousSchool, guardianName, guardianRelationship,
      guardianNIC, guardianPhone, guardianAddress, guardianOccupation,
      guardianEmail, emergencyContactName, emergencyContactPhone,
      emergencyRelationship, medicalConditions, allergies, status
    } = studentData;

    if (!fullName || !nameWithInitials || !gender || !studentData.dateOfBirth || !classId) {
      res.status(400).json({ success: false, error: 'Missing required student information' });
      return;
    }

    // Validate date strings
    const dob = new Date(studentData.dateOfBirth);
    if (isNaN(dob.getTime())) {
      res.status(400).json({ 
        success: false, 
        error: `Invalid date of birth provided: ${studentData.dateOfBirth}`
      });
      return;
    }

    const admDate = admissionDate ? new Date(admissionDate) : new Date();
    if (isNaN(admDate.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid admission date provided' });
      return;
    }

    // Handle Profile Photo Upload
    let profilePhotoUrl = null;
    if (files && files['profilePhoto'] && files['profilePhoto'][0]) {
      profilePhotoUrl = await uploadToCloudinary(files['profilePhoto'][0], 'students/profiles');
      uploadedUrls.push(profilePhotoUrl);
    }

    // Handle Documents Upload
    const documentsData: any[] = [];
    if (files && files['documents']) {
      for (const file of files['documents']) {
        const fileUrl = await uploadToCloudinary(file, 'students/documents');
        uploadedUrls.push(fileUrl);
        documentsData.push({
          documentType: 'OTHER', // Default type
          fileName: file.originalname,
          fileUrl: fileUrl,
        });
      }
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
        admissionNumber,
        fullName,
        nameWithInitials,
        dateOfBirth: dob,
        gender,
        bloodGroup,
        religion,
        ethnicity,
        nationality: nationality || 'Sri Lankan',
        nic,
        birthCertificateNo,
        address,
        city,
        district,
        province,
        postalCode,
        mobileNumber,
        homePhone,
        email,
        classId,
        admissionDate: admDate,
        previousSchool,
        guardianName,
        guardianRelationship,
        guardianNIC,
        guardianPhone,
        guardianAddress,
        guardianOccupation,
        guardianEmail,
        emergencyContactName,
        emergencyContactPhone,
        emergencyRelationship,
        medicalConditions,
        allergies,
        profilePhoto: profilePhotoUrl,
        status: status || 'ACTIVE',
        documents: {
          create: documentsData,
        },
      },
      include: {
        class: true,
        documents: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: student,
    });
  } catch (error: any) {
    console.error('Error registering student:', error);
    
    // Cleanup uploaded files if registration fails
    for (const url of uploadedUrls) {
      try {
        await deleteFromCloudinary(url);
      } catch (deleteError) {
        console.error('Failed to cleanup file:', url, deleteError);
      }
    }
    
    // Handle Prisma Unique Constraint Errors (P2002)
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      const field = Array.isArray(target) ? target.join(', ') : String(target);
      
      let message = 'A record with this information already exists.';
      if (field.includes('admissionNumber')) message = 'This admission number is already in use.';
      if (field.includes('nic')) message = 'A student with this NIC is already registered.';
      if (field.includes('birthCertificateNo')) message = 'A student with this Birth Certificate number is already registered.';
      if (field.includes('email')) message = 'This email address is already in use.';

      res.status(400).json({ 
        success: false, 
        error: message 
      });
      return;
    }

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
    console.error('CRITICAL: Error fetching students:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch students',
      details: error instanceof Error ? error.message : String(error)
    });
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
