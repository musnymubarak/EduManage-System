import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// GET /api/academic-years
export const getAllAcademicYears = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
    });
    res.json({ success: true, data: years });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch academic years' });
  }
};

// POST /api/academic-years
export const createAcademicYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, startDate, endDate, isCurrent } = req.body;

    if (!year || !startDate || !endDate) {
      res.status(400).json({ success: false, error: 'Year, start date, and end date are required' });
      return;
    }

    // Check if year already exists
    const existing = await prisma.academicYear.findUnique({
      where: { year },
    });

    if (existing) {
      res.status(400).json({ success: false, error: `Academic year ${year} already exists` });
      return;
    }

    // If setting as current, we do it in a transaction to unset any existing current
    const newYear = await prisma.$transaction(async (tx) => {
      // Retrieve current active year before any state mutations
      const activeYear = await tx.academicYear.findFirst({
        where: { isCurrent: true },
      });

      if (isCurrent) {
        await tx.academicYear.updateMany({
          data: { isCurrent: false },
        });
      }

      const createdYear = await tx.academicYear.create({
        data: {
          year,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isCurrent: !!isCurrent,
        },
      });

      let classesToClone: any[] = [];
      if (activeYear) {
        classesToClone = await tx.class.findMany({
          where: { academicYear: activeYear.year },
        });
      }

      if (classesToClone.length > 0) {
        for (const c of classesToClone) {
          const classExists = await tx.class.findFirst({
            where: { name: c.name, academicYear: year },
          });
          if (!classExists) {
            await tx.class.create({
              data: {
                name: c.name,
                grade: c.grade,
                section: c.section,
                capacity: c.capacity,
                academicYear: year,
              },
            });
          }
        }
      } else {
        const defaultClasses = [
          { name: '9A', grade: 9, section: 'A' },
          { name: '9B', grade: 9, section: 'B' },
          { name: '10A', grade: 10, section: 'A' },
          { name: '10B', grade: 10, section: 'B' },
          { name: '11A', grade: 11, section: 'A' },
          { name: '11B', grade: 11, section: 'B' },
          { name: 'A/L 1st Year', grade: 12, section: 'A' },
          { name: 'A/L 2nd Year', grade: 12, section: 'A' },
          { name: 'A/L 3rd Year', grade: 12, section: 'A' }
        ];

        for (const c of defaultClasses) {
          const classExists = await tx.class.findFirst({
            where: { name: c.name, academicYear: year },
          });
          if (!classExists) {
            await tx.class.create({
              data: {
                name: c.name,
                grade: c.grade,
                section: c.section,
                capacity: 30,
                academicYear: year,
              },
            });
          }
        }
      }

      return createdYear;
    });

    res.status(201).json({ success: true, data: newYear });
  } catch (error) {
    console.error('Error creating academic year:', error);
    res.status(500).json({ success: false, error: 'Failed to create academic year' });
  }
};

// PUT /api/academic-years/:id
export const updateAcademicYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { year, startDate, endDate, isCurrent } = req.body;

    // Check if it exists
    const existing = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Academic year not found' });
      return;
    }

    // Check if year name is being updated to an already existing year
    if (year && year !== existing.year) {
      const yearConflict = await prisma.academicYear.findUnique({
        where: { year },
      });
      if (yearConflict) {
        res.status(400).json({ success: false, error: `Academic year ${year} already exists` });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isCurrent && !existing.isCurrent) {
        await tx.academicYear.updateMany({
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.update({
        where: { id },
        data: {
          year: year ?? existing.year,
          startDate: startDate ? new Date(startDate) : existing.startDate,
          endDate: endDate ? new Date(endDate) : existing.endDate,
          isCurrent: isCurrent !== undefined ? !!isCurrent : existing.isCurrent,
        },
      });
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating academic year:', error);
    res.status(500).json({ success: false, error: 'Failed to update academic year' });
  }
};

// DELETE /api/academic-years/:id
export const deleteAcademicYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Academic year not found' });
      return;
    }

    if (existing.isCurrent) {
      res.status(400).json({ success: false, error: 'Cannot delete the current active academic year' });
      return;
    }

    // Check if any classes or fees reference this academic year string
    const classCount = await prisma.class.count({
      where: { academicYear: existing.year },
    });

    const feeCount = await prisma.feePayment.count({
      where: { academicYear: existing.year },
    });

    if (classCount > 0 || feeCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete academic year ${existing.year} because it is referenced by classes or fee records.`,
      });
      return;
    }

    await prisma.academicYear.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Academic year deleted successfully' });
  } catch (error) {
    console.error('Error deleting academic year:', error);
    res.status(500).json({ success: false, error: 'Failed to delete academic year' });
  }
};

// PUT /api/academic-years/:id/set-current
export const setCurrentAcademicYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Academic year not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Set all to false
      await tx.academicYear.updateMany({
        data: { isCurrent: false },
      });

      // Set this one to true
      await tx.academicYear.update({
        where: { id },
        data: { isCurrent: true },
      });
    });

    res.json({ success: true, message: `Academic year ${existing.year} is now set as the active year` });
  } catch (error) {
    console.error('Error setting current academic year:', error);
    res.status(500).json({ success: false, error: 'Failed to set current academic year' });
  }
};
