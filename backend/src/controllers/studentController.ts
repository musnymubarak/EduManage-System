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
      province, postalCode, gnDivision, dsDivision, mobileNumber, homePhone, email, classId,
      admissionDate, previousSchool, guardianName, guardianRelationship,
      guardianNIC, guardianPhones, guardianAddress, guardianOccupation,
      guardianEmail, emergencyContactName, emergencyContactPhone,
      emergencyRelationship, medicalConditions, allergies, status,
      indexNumber
    } = studentData;

    // Sanitize Enum and Unique fields
    const sanitizedBloodGroup = bloodGroup === '' ? null : bloodGroup;
    const sanitizedGender = gender === '' ? undefined : gender;
    const sanitizedNic = nic === '' ? null : nic;
    const sanitizedIndexNumber = indexNumber === '' ? null : indexNumber;
    const sanitizedBirthCertificateNo = birthCertificateNo === '' ? null : birthCertificateNo;

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
        indexNumber: sanitizedIndexNumber,
        fullName,
        nameWithInitials,
        dateOfBirth: dob,
        gender: sanitizedGender,
        bloodGroup: sanitizedBloodGroup,
        religion,
        ethnicity,
        nationality: nationality || 'Sri Lankan',
        nic: sanitizedNic,
        birthCertificateNo: sanitizedBirthCertificateNo,
        address,
        city,
        district,
        province,
        postalCode,
        gnDivision,
        dsDivision,
        mobileNumber,
        homePhone,
        email,
        classId,
        admissionDate: admDate,
        previousSchool,
        guardianName,
        guardianRelationship,
        guardianNIC,
        guardianPhones: Array.isArray(guardianPhones) ? guardianPhones : (guardianPhones ? [guardianPhones] : []),
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
      } as any,
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
        { indexNumber: { contains: search as string, mode: 'insensitive' } },
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
          orderBy: { paymentDate: 'desc' },
        },
        attendance: {
          orderBy: { date: 'desc' },
        },
        examMarks: {
          include: {
            exam: true,
          },
          orderBy: {
            exam: {
              examDate: 'desc',
            },
          },
        },
        medicalHistory: true,
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
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Create a clean update object with only allowed fields
    const allowedFields = [
      'fullName', 'nameWithInitials', 'dateOfBirth', 'gender', 'bloodGroup',
      'religion', 'ethnicity', 'nationality', 'nic', 'birthCertificateNo',
      'indexNumber', 'classId', 'address', 'city', 'district', 'province',
      'postalCode', 'gnDivision', 'dsDivision', 'mobileNumber', 'homePhone', 'email', 'admissionDate',
      'previousSchool', 'guardianName', 'guardianRelationship', 'guardianNIC',
      'guardianPhones', 'guardianAddress', 'guardianOccupation', 'guardianEmail',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyRelationship',
      'status', 'leavingDate', 'leavingReason', 'leavingReasonOther'
    ];

    const updateData: any = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Sanitize Enum and Unique fields
    if (updateData.bloodGroup === '') {
      updateData.bloodGroup = null;
    }
    if (updateData.gender === '') {
      delete updateData.gender;
    }
    if (updateData.nic === '') {
      updateData.nic = null;
    }
    if (updateData.indexNumber === '') {
      updateData.indexNumber = null;
    }
    if (updateData.birthCertificateNo === '') {
      updateData.birthCertificateNo = null;
    }

    // Convert date strings to Date objects if present
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    if (updateData.admissionDate) {
      updateData.admissionDate = new Date(updateData.admissionDate);
    }

    if (updateData.guardianPhones !== undefined) {
      updateData.guardianPhones = Array.isArray(updateData.guardianPhones) 
        ? updateData.guardianPhones 
        : (updateData.guardianPhones ? [updateData.guardianPhones] : []);
    }

    // Handle Profile Photo Removal or Update
    if (req.body.removeProfilePhoto === 'true') {
      const currentStudent = await prisma.student.findUnique({ where: { id } });
      if (currentStudent?.profilePhoto) {
        try {
          await deleteFromCloudinary(currentStudent.profilePhoto);
        } catch (e) {
          console.error('Failed to delete old profile photo:', e);
        }
      }
      updateData.profilePhoto = null;
    } else if (files && files['profilePhoto'] && files['profilePhoto'][0]) {
      // Get current student to possibly delete old photo
      const currentStudent = await prisma.student.findUnique({ where: { id } });
      if (currentStudent?.profilePhoto) {
        try {
          await deleteFromCloudinary(currentStudent.profilePhoto);
        } catch (e) {
          console.error('Failed to delete old profile photo:', e);
        }
      }
      updateData.profilePhoto = await uploadToCloudinary(files['profilePhoto'][0], 'students/profiles');
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...updateData,
        mobileNumber: updateData.mobileNumber 
          ? (Array.isArray(updateData.mobileNumber) ? updateData.mobileNumber[0] : updateData.mobileNumber)
          : undefined
      } as any,
      include: {
        class: true,
      },
    });

    // Handle Documents Upload if present
    if (files && files['documents']) {
      const documentUploadPromises = files['documents'].map(async (file) => {
        const fileUrl = await uploadToCloudinary(file, 'students/documents');
        return prisma.studentDocument.create({
          data: {
            studentId: id,
            documentType: 'OTHER',
            fileName: file.originalname,
            fileUrl,
          },
        });
      });
      await Promise.all(documentUploadPromises);
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student,
    });
  } catch (error: any) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update student',
      details: error.code === 'P2002' ? 'Duplicate value detected' : undefined
    });
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

export const markStudentAsLeft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { leavingReason, leavingReasonOther, leavingDate } = req.body;

    const validReasons = ['GRADUATED', 'LEFT_FOR_ANOTHER_SCHOOL', 'SUSPENDED', 'DISMISSED_EXPELLED', 'OTHER'];
    if (!validReasons.includes(leavingReason)) {
      res.status(400).json({ success: false, error: 'Invalid leaving reason provided' });
      return;
    }

    if (leavingReason === 'OTHER' && !leavingReasonOther) {
      res.status(400).json({ success: false, error: 'Please specify the reason' });
      return;
    }

    await prisma.student.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        leavingDate: leavingDate ? new Date(leavingDate) : new Date(),
        leavingReason,
        leavingReasonOther: leavingReason === 'OTHER' ? leavingReasonOther : null,
      },
    });

    res.json({
      success: true,
      message: 'Student marked as left successfully',
    });
  } catch (error) {
    console.error('Error marking student as left:', error);
    res.status(500).json({ success: false, error: 'Failed to mark student as left' });
  }
};

export const getStudentMedicalHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const medicalHistory = await prisma.studentMedicalHistory.findUnique({
      where: { studentId: id },
    });

    res.json({
      success: true,
      data: medicalHistory,
    });
  } catch (error) {
    console.error('Error fetching medical history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch medical history' });
  }
};

export const upsertStudentMedicalHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const medicalHistory = await prisma.studentMedicalHistory.upsert({
      where: { studentId: id },
      update: updateData,
      create: {
        studentId: id,
        ...updateData,
      },
    });

    res.json({
      success: true,
      message: 'Medical history updated successfully',
      data: medicalHistory,
    });
  } catch (error) {
    console.error('Error updating medical history:', error);
    res.status(500).json({ success: false, error: 'Failed to update medical history' });
  }
};

export const getMigrationPreview = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Fetch all classes
    const classes = await prisma.class.findMany({
      orderBy: [
        { grade: 'asc' },
        { name: 'asc' }
      ]
    });

    // 2. Fetch all active students
    const students = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        admissionNumber: true,
        indexNumber: true,
        fullName: true,
        classId: true
      },
      orderBy: { fullName: 'asc' }
    });

    // 3. Helper to determine the default target class
    const getSuggestedNextClass = (currentClass: any, allClasses: any[]) => {
      if (currentClass.grade === 9) {
        return allClasses.find(c => c.grade === 10 && c.section === currentClass.section) || null;
      }
      if (currentClass.grade === 10) {
        return allClasses.find(c => c.grade === 11 && c.section === currentClass.section) || null;
      }
      if (currentClass.grade === 11) {
        return allClasses.find(c => c.name === 'A/L 1st Year') || null;
      }
      if (currentClass.grade === 12) {
        if (currentClass.name === 'A/L 1st Year') {
          return allClasses.find(c => c.name === 'A/L 2nd Year') || null;
        }
        if (currentClass.name === 'A/L 2nd Year') {
          return allClasses.find(c => c.name === 'A/L 3rd Year') || null;
        }
        return null; // A/L 3rd Year defaults to graduation (null)
      }
      return null;
    };

    // 4. Group data by class
    const migrationGroups = classes.map(currentClass => {
      const classStudents = students.filter(s => s.classId === currentClass.id);
      const defaultNextClass = getSuggestedNextClass(currentClass, classes);

      // Determine available target classes (all other classes except the current one)
      const availableTargetClasses = classes.filter(c => c.id !== currentClass.id);

      return {
        classId: currentClass.id,
        className: currentClass.name,
        grade: currentClass.grade,
        section: currentClass.section,
        academicYear: currentClass.academicYear,
        students: classStudents,
        studentCount: classStudents.length,
        defaultNextClass: defaultNextClass ? { id: defaultNextClass.id, name: defaultNextClass.name } : null,
        availableTargetClasses: availableTargetClasses.map(c => ({ id: c.id, name: c.name }))
      };
    });

    res.json({
      success: true,
      data: {
        classes: migrationGroups,
        totalStudents: students.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching migration preview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch migration preview' });
  }
};

export const executeMigration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { migrations, targetAcademicYear } = req.body; 

    if (!Array.isArray(migrations) || migrations.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid or empty migrations array' });
      return;
    }

    if (targetAcademicYear) {
      // Verify target academic year exists
      const yearExists = await prisma.academicYear.findUnique({
        where: { year: targetAcademicYear },
      });
      if (!yearExists) {
        res.status(400).json({ success: false, error: `Academic year '${targetAcademicYear}' does not exist. Please create it first.` });
        return;
      }
    }

    // Execute bulk update in a transaction
    await prisma.$transaction(async (tx) => {
      // Cache to avoid redundant DB queries for finding cloned class IDs
      const targetClassCache = new Map<string, string>();

      const getTargetClassIdForName = async (className: string) => {
        if (targetClassCache.has(className)) {
          return targetClassCache.get(className)!;
        }

        const match = await tx.class.findUnique({
          where: {
            name_academicYear: {
              name: className,
              academicYear: targetAcademicYear
            }
          }
        });

        if (!match) {
          throw new Error(`Class '${className}' does not exist for academic year '${targetAcademicYear}'`);
        }

        targetClassCache.set(className, match.id);
        return match.id;
      };

      for (const m of migrations) {
        const { studentId, action, targetClassId } = m;

        if (action === 'PROMOTE') {
          if (!targetClassId) {
            throw new Error(`Target class missing for promoted student: ${studentId}`);
          }
          
          const oldTargetClass = await tx.class.findUnique({
            where: { id: targetClassId }
          });
          
          if (!oldTargetClass) {
            throw new Error(`Target class with ID '${targetClassId}' not found`);
          }

          const newTargetClassId = await getTargetClassIdForName(oldTargetClass.name);

          await tx.student.update({
            where: { id: studentId },
            data: { classId: newTargetClassId }
          });
        } else if (action === 'LEAVE') {
          await tx.student.update({
            where: { id: studentId },
            data: {
              status: 'INACTIVE',
              leavingDate: new Date(),
              leavingReason: 'GRADUATED'
            }
          });
        } else if (action === 'RETAIN') {
          // If retained, stay in same class name but move to the target academic year's class record
          const student = await tx.student.findUnique({
            where: { id: studentId },
            include: { class: true }
          });
          
          if (student) {
            const newClassId = await getTargetClassIdForName(student.class.name);
            await tx.student.update({
              where: { id: studentId },
              data: { classId: newClassId }
            });
          }
        }
      }

      if (targetAcademicYear) {
        // Set the target academic year as the active/current year
        await tx.academicYear.updateMany({
          data: { isCurrent: false }
        });
        await tx.academicYear.update({
          where: { year: targetAcademicYear },
          data: { isCurrent: true }
        });
      }
    });

    res.json({
      success: true,
      message: 'Student migration completed successfully'
    });
  } catch (error: any) {
    console.error('Error executing student migration:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to execute migration' });
  }
};

