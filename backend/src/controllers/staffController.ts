import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';

export const registerStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    const uploadedUrls: string[] = [];
    try {
        const staffData = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Validate date strings
        const dobStr = Array.isArray(staffData.dateOfBirth) ? staffData.dateOfBirth[0] : staffData.dateOfBirth;
        const dob = new Date(dobStr);
        if (isNaN(dob.getTime())) {
            res.status(400).json({ success: false, error: 'Invalid date of birth provided' });
            return;
        }

        const joinedDateStr = Array.isArray(staffData.joinedDate) ? staffData.joinedDate[0] : staffData.joinedDate;
        const joinedDate = joinedDateStr ? new Date(joinedDateStr) : new Date();
        if (isNaN(joinedDate.getTime())) {
            res.status(400).json({ success: false, error: 'Invalid joined date provided' });
            return;
        }

        // Handle Profile Photo Upload
        let profilePhotoUrl = null;
        if (files && files['profilePhoto'] && files['profilePhoto'][0]) {
            profilePhotoUrl = await uploadToCloudinary(files['profilePhoto'][0], 'staff/profiles');
            uploadedUrls.push(profilePhotoUrl);
        }

        // Generate employee number
        const lastStaff = await prisma.staff.findFirst({
            orderBy: { employeeNumber: 'desc' },
        });

        const nextNumber = lastStaff 
            ? parseInt(lastStaff.employeeNumber.split('-')[1]) + 1
            : 1;
        
        const employeeNumber = `STF-${nextNumber.toString().padStart(4, '0')}`;

        // Parse numeric fields
        const basicSalary = staffData.basicSalary ? parseFloat(staffData.basicSalary) : 0;

        const staff = await prisma.staff.create({
            data: {
                employeeNumber,
                fullName: staffData.fullName,
                nameWithInitials: staffData.nameWithInitials,
                dateOfBirth: dob,
                gender: staffData.gender,
                nic: staffData.nic,
                drivingLicenseNo: staffData.drivingLicenseNo || null,
                address: staffData.address,
                city: staffData.city,
                district: staffData.district,
                province: staffData.province,
                postalCode: staffData.postalCode,
                mobileNumber: staffData.mobileNumber,
                email: staffData.email,
                joinedDate: joinedDate,
                department: staffData.department,
                designation: staffData.designation,
                employmentType: staffData.employmentType,
                profilePhoto: profilePhotoUrl,
                basicSalary: basicSalary,
                status: staffData.status || 'ACTIVE',
            }
        });

        // Handle Documents Upload
        if (files && files['documents']) {
            const documentUploadPromises = files['documents'].map(async (file) => {
                const fileUrl = await uploadToCloudinary(file, 'staff/documents');
                return prisma.staffDocument.create({
                    data: {
                        staffId: staff.id,
                        documentType: 'Identification/Verification',
                        fileName: file.originalname,
                        fileUrl,
                    },
                });
            });
            await Promise.all(documentUploadPromises);
        }

        res.status(201).json({
            success: true,
            message: 'Staff member registered successfully',
            data: staff,
        });
    } catch (error: any) {
        console.error('Error registering staff:', error);

        // Cleanup uploaded files if registration fails
        for (const url of uploadedUrls) {
            try {
                await deleteFromCloudinary(url);
            } catch (deleteError) {
                console.error('Failed to cleanup file:', url, deleteError);
            }
        }

        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            const field = Array.isArray(target) ? target.join(', ') : String(target);
            
            let message = 'A record with this information already exists.';
            if (field.includes('employeeNumber')) message = 'This employee number is already in use.';
            if (field.includes('nic')) message = 'A staff member with this NIC is already registered.';
            if (field.includes('drivingLicenseNo')) message = 'This driving license number is already registered.';
            if (field.includes('email')) message = 'This email address is already in use.';

            res.status(400).json({ success: false, error: message });
            return;
        }

        res.status(500).json({ success: false, error: error.message || 'Failed to register staff' });
    }
};

export const getAllStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, search, department } = req.query;

        const where: any = {};
        
        if (status) where.status = status;
        if (department) where.department = department;
        if (search) {
            where.OR = [
                { fullName: { contains: search as string, mode: 'insensitive' } },
                { employeeNumber: { contains: search as string, mode: 'insensitive' } },
                { nic: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const staff = await prisma.staff.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: staff,
            total: staff.length,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
};

export const getStaffById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const staff = await prisma.staff.findUnique({
            where: { id },
            include: {
                documents: true,
                duties: {
                    orderBy: { createdAt: 'desc' }
                },
                attendance: {
                    orderBy: { date: 'desc' },
                    take: 30,
                },
                salaryHistory: {
                    orderBy: { month: 'desc' }
                }
            },
        });

        if (!staff) {
            throw new AppError('Staff member not found', 404);
        }

        res.json({
            success: true,
            data: staff,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to fetch staff details' });
        }
    }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Create a clean update object with only allowed fields
        const allowedFields = [
            'fullName', 'nameWithInitials', 'dateOfBirth', 'gender', 'nic',
            'drivingLicenseNo', 'address', 'city', 'district', 'province',
            'postalCode', 'mobileNumber', 'email', 'department', 'designation',
            'employmentType', 'joinedDate', 'basicSalary', 'status'
        ];

        const updateData: any = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Parse numeric fields
        if (updateData.basicSalary) {
            updateData.basicSalary = parseFloat(updateData.basicSalary);
        }

        // Handle Dates
        if (updateData.dateOfBirth) {
            const dobStr = Array.isArray(updateData.dateOfBirth) ? updateData.dateOfBirth[0] : updateData.dateOfBirth;
            updateData.dateOfBirth = new Date(dobStr);
        }
        if (updateData.joinedDate) {
            const joinedDateStr = Array.isArray(updateData.joinedDate) ? updateData.joinedDate[0] : updateData.joinedDate;
            updateData.joinedDate = new Date(joinedDateStr);
        }

        // Handle Profile Photo Removal or Update
        if (req.body.removeProfilePhoto === 'true') {
            const currentStaff = await prisma.staff.findUnique({ where: { id } });
            if (currentStaff?.profilePhoto) {
                try {
                    await deleteFromCloudinary(currentStaff.profilePhoto);
                } catch (e) {
                    console.error('Failed to delete old profile photo:', e);
                }
            }
            updateData.profilePhoto = null;
        } else if (files && files['profilePhoto'] && files['profilePhoto'][0]) {
            // Get current staff to possibly delete old photo from Cloudinary
            const currentStaff = await prisma.staff.findUnique({ where: { id } });
            if (currentStaff?.profilePhoto) {
                try {
                    await deleteFromCloudinary(currentStaff.profilePhoto);
                } catch (e) {
                    console.error('Failed to delete old profile photo:', e);
                }
            }
            updateData.profilePhoto = await uploadToCloudinary(files['profilePhoto'][0], 'staff/profiles');
        }

        const staff = await prisma.staff.update({
            where: { id },
            data: updateData,
        });

        // Handle Documents Upload
        if (files && files['documents']) {
            const documentUploadPromises = files['documents'].map(async (file) => {
                const fileUrl = await uploadToCloudinary(file, 'staff/documents');
                return prisma.staffDocument.create({
                    data: {
                        staffId: id,
                        documentType: 'Additional Document',
                        fileName: file.originalname,
                        fileUrl,
                    },
                });
            });
            await Promise.all(documentUploadPromises);
        }

        res.json({
            success: true,
            message: 'Staff details updated successfully',
            data: staff,
        });
    } catch (error: any) {
        console.error('Error updating staff:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to update staff' 
        });
    }
};

export const recordSalaryPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { month, basicSalary, allowances, deductions, paymentMethod, receiptNumber, remarks } = req.body;

        const netSalary = parseFloat(basicSalary) + parseFloat(allowances || 0) - parseFloat(deductions || 0);

        const salary = await prisma.staffSalary.create({
            data: {
                staffId: id,
                month,
                basicSalary: parseFloat(basicSalary),
                allowances: parseFloat(allowances || 0),
                deductions: parseFloat(deductions || 0),
                netSalary,
                paymentMethod,
                receiptNumber: receiptNumber || null,
                remarks,
                paidBy: req.user?.id || 'System'
            }
        });

        // Automatically log this as an Expenditure in the financial ledger
        const staff = await prisma.staff.findUnique({
            where: { id },
            select: { fullName: true }
        });

        await prisma.expenditure.create({
            data: {
                date: new Date(),
                category: 'SALARIES',
                description: `Staff Salary - ${staff?.fullName || 'Unknown Personnel'} (${month})`,
                amount: netSalary,
                vendor: staff?.fullName || 'Staff Member', 
                billNumber: receiptNumber || null,
                paymentMethod: paymentMethod || 'CASH',
                remarks: remarks,
                recordedBy: req.user?.id || 'System'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Salary payment recorded successfully',
            data: salary,
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(400).json({ success: false, error: 'Salary for this month has already been recorded' });
            return;
        }
        res.status(500).json({ success: false, error: 'Failed to record salary payment' });
    }
};

export const deleteStaffSalary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { salaryId } = req.params;
        
        // Let's find the salary record first so we could theoretically delete the matched expenditure,
        // but for now we just delete the salary record.
        await prisma.staffSalary.delete({
            where: { id: salaryId }
        });

        res.json({
            success: true,
            message: 'Salary record removed successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete salary record' });
    }
};

export const assignStaffDuty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, dueDate } = req.body;

        const duty = await prisma.staffDuty.create({
            data: {
                staffId: id,
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'ASSIGNED'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Duty assigned successfully',
            data: duty,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign duty' });
    }
};

export const updateDutyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { dutyId } = req.params;
        const { status, remarks } = req.body;

        const updateData: any = { status, remarks };
        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }

        const duty = await prisma.staffDuty.update({
            where: { id: dutyId },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Duty status updated',
            data: duty,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update duty status' });
    }
};

export const deleteStaffDuty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { dutyId } = req.params;
        await prisma.staffDuty.delete({
            where: { id: dutyId }
        });

        res.json({
            success: true,
            message: 'Duty removed successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove duty' });
    }
};
