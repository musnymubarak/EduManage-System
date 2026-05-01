import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';

export const registerTeacher = async (req: AuthRequest, res: Response): Promise<void> => {
  const uploadedUrls: string[] = [];
  try {
    const { qualifications, ...teacherData } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

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

    // Handle Profile Photo Upload
    let profilePhotoUrl = null;
    if (files && files['profilePhoto'] && files['profilePhoto'][0]) {
      profilePhotoUrl = await uploadToCloudinary(files['profilePhoto'][0], 'teachers/profiles');
      uploadedUrls.push(profilePhotoUrl);
    }

    // Generate employee number
    const lastTeacher = await prisma.teacher.findFirst({
      orderBy: { employeeNumber: 'desc' },
    });

    const nextNumber = lastTeacher 
      ? parseInt(lastTeacher.employeeNumber.split('-')[1]) + 1
      : 1;
    
    const employeeNumber = `TCH-${nextNumber.toString().padStart(4, '0')}`;

    // Map qualifications
    const qualificationsArray = qualifications ? (typeof qualifications === 'string' ? JSON.parse(qualifications) : qualifications) : [];
    const mappedQualifications = qualificationsArray.map((q: any) => ({
      qualification: q.degree || q.qualification,
      institution: q.institution,
      year: parseInt(q.year),
      field: q.fieldOfStudy || q.field
    }));

    // Filter teacherData to only include fields in the schema
    const { basicSalary, ...restData } = teacherData;

    const teacher = await prisma.teacher.create({
      data: {
        employeeNumber,
        fullName: restData.fullName,
        nameWithInitials: restData.nameWithInitials,
        dateOfBirth: dob,
        gender: restData.gender,
        nic: restData.nic,
        address: restData.address,
        city: restData.city,
        district: restData.district,
        province: restData.province,
        postalCode: restData.postalCode,
        mobileNumber: restData.mobileNumber,
        email: restData.email,
        joinedDate: joinedDate,
        designation: restData.designation,
        employmentType: restData.employmentType,
        profilePhoto: profilePhotoUrl,
        basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
        status: restData.status || 'ACTIVE',
        qualifications: {
          create: mappedQualifications,
        },
      },
      include: {
        qualifications: true,
      },
    });

    // Handle Documents Upload
    if (files && files['documents']) {
      const documentUploadPromises = files['documents'].map(async (file) => {
        const fileUrl = await uploadToCloudinary(file, 'teachers/documents');
        return prisma.teacherDocument.create({
          data: {
            teacherId: teacher.id,
            documentType: 'Qualification/Identity',
            fileName: file.originalname,
            fileUrl,
          },
        });
      });
      await Promise.all(documentUploadPromises);
    }

    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      data: teacher,
    });
  } catch (error: any) {
    console.error('Error registering teacher:', error);

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
      if (field.includes('employeeNumber')) message = 'This employee number is already in use.';
      if (field.includes('nic')) message = 'A teacher with this NIC is already registered.';
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
      res.status(500).json({ success: false, error: 'Failed to register teacher' });
    }
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
        memos: {
          orderBy: { date: 'desc' },
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
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Convert date strings to Date objects
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.joinedDate) {
      updateData.joinedDate = new Date(updateData.joinedDate);
    }

    // Parse numeric fields
    if (updateData.basicSalary) {
      updateData.basicSalary = parseFloat(updateData.basicSalary);
    }

    // Handle Profile Photo Removal or Update
    if (updateData.removeProfilePhoto === 'true') {
      const currentTeacher = await prisma.teacher.findUnique({ where: { id } });
      if (currentTeacher?.profilePhoto) {
        try {
          await deleteFromCloudinary(currentTeacher.profilePhoto);
        } catch (e) {
          console.error('Failed to delete old profile photo:', e);
        }
      }
      updateData.profilePhoto = null;
      delete updateData.removeProfilePhoto;
    } else if (files && files['profilePhoto'] && files['profilePhoto'][0]) {
      const currentTeacher = await prisma.teacher.findUnique({ where: { id } });
      if (currentTeacher?.profilePhoto) {
        try {
          await deleteFromCloudinary(currentTeacher.profilePhoto);
        } catch (e) {
          console.error('Failed to delete old profile photo:', e);
        }
      }
      updateData.profilePhoto = await uploadToCloudinary(files['profilePhoto'][0], 'teachers/profiles');
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
    console.error('Error updating teacher:', error);
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

export const addTeacherMemo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const memo = await prisma.teacherMemo.create({
      data: {
        teacherId: id,
        title,
        content,
        createdBy: req.user!.username || 'Admin',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Memo added successfully',
      data: memo,
    });
  } catch (error) {
    console.error('Error adding memo:', error);
    res.status(500).json({ error: 'Failed to add memo' });
  }
};

export const deleteTeacherMemo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memoId } = req.params;

    await prisma.teacherMemo.delete({
      where: { id: memoId },
    });

    res.json({
      success: true,
      message: 'Memo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting memo:', error);
    res.status(500).json({ error: 'Failed to delete memo' });
  }
};
