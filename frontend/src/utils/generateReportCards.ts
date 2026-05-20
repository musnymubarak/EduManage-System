import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toReportResult, addPageFooter, ReportResult } from './generateReports';
import api from '../services/api';

const INSTITUTION_NAME = 'SUMAIYA ARABIC LADIES COLLEGE';

const TERM_LABELS: Record<string, string> = {
  FIRST_TERM: 'First Term',
  SECOND_TERM: 'Second Term',
  THIRD_TERM: 'Third Term',
};

function getGradeColor(grade: string): [number, number, number] {
  switch (grade) {
    case 'A': return [16, 185, 129];   // emerald
    case 'B': return [59, 130, 246];   // blue
    case 'C': return [245, 158, 11];   // amber
    case 'S': return [249, 115, 22];   // orange
    case 'F': return [239, 68, 68];    // red
    default: return [107, 114, 128];   // gray
  }
}

function addReportCardHeader(doc: jsPDF, term: string, academicYear: string) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(INSTITUTION_NAME, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Report Card', pageWidth / 2, 26, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${TERM_LABELS[term] || term}  |  Academic Year: ${academicYear}`, pageWidth / 2, 33, { align: 'center' });
  doc.setTextColor(0);

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.8);
  doc.line(15, 37, pageWidth - 15, 37);
}

function addStudentInfo(doc: jsPDF, student: any, className: string, y: number): number {
  const pageWidth = doc.internal.pageSize.width;
  const mid = pageWidth / 2;

  doc.setFillColor(245, 243, 255);
  doc.rect(15, y, pageWidth - 30, 18, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Student:', 20, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(student.studentName || student.fullName || '', 48, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Adm No:', mid + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(student.admissionNumber || '', mid + 30, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Class:', 20, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(className, 42, y + 14);

  if (student.indexNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('Index No:', mid + 5, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(student.indexNumber, mid + 33, y + 14);
  }

  return y + 22;
}

function renderStudentReportPage(
  doc: jsPDF,
  student: any,
  className: string,
  term: string,
  academicYear: string,
  totalStudents: number
) {
  addReportCardHeader(doc, term, academicYear);
  let y = addStudentInfo(doc, student, className, 42);

  y += 4;

  // Subject performance table
  const tableBody = student.subjectBreakdown.map((s: any, i: number) => {
    const pct = s.totalMarks > 0 ? ((s.marksObtained / s.totalMarks) * 100).toFixed(1) : '0.0';
    return [
      (i + 1).toString(),
      s.subject || s.examName,
      s.marksObtained.toString(),
      s.totalMarks.toString(),
      `${pct}%`,
      s.classHighest.toString(),
      s.classAverage.toFixed(1),
      s.grade,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Subject', 'Marks', 'Total', '%', 'Highest', 'Average', 'Grade']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { halign: 'left', cellWidth: 45 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 7) {
        const grade = data.cell.raw as string;
        data.cell.styles.textColor = getGradeColor(grade);
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Summary section
  const percentage = student.percentage ?? (student.totalMax > 0
    ? ((student.totalObtained / student.totalMax) * 100).toFixed(1)
    : '0.0');
  const overallGrade = student.overallGrade || 'N/A';
  const rank = student.rank || 'N/A';
  const pageWidth = doc.internal.pageSize.width;

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, 28, 'S');

  doc.setFillColor(245, 243, 255);
  doc.rect(15, y, pageWidth - 30, 10, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 20, y + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryY = y + 18;

  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 20, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.totalObtained} / ${student.totalMax}`, 40, summaryY);

  doc.setFont('helvetica', 'bold');
  doc.text('Percentage:', 80, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${percentage}%`, 108, summaryY);

  doc.setFont('helvetica', 'bold');
  doc.text('Grade:', 130, summaryY);
  doc.setFont('helvetica', 'normal');
  const gradeColor = getGradeColor(overallGrade);
  doc.setTextColor(gradeColor[0], gradeColor[1], gradeColor[2]);
  doc.text(overallGrade, 148, summaryY);
  doc.setTextColor(0);

  doc.setFont('helvetica', 'bold');
  doc.text('Rank:', 165, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rank} out of ${totalStudents}`, 180, summaryY);

  y += 40;

  // Signature section
  doc.setDrawColor(200);
  doc.line(20, y + 10, 80, y + 10);
  doc.line(pageWidth - 80, y + 10, pageWidth - 20, y + 10);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Class Teacher's Signature", 22, y + 16);
  doc.text("Principal's Signature", pageWidth - 78, y + 16);
  doc.setTextColor(0);
}

// ============================================================
// Public Report Functions
// ============================================================

/**
 * Generate individual student report card for one term
 */
export async function generateStudentReportCard(
  classId: string,
  term: string,
  academicYear: string,
  studentId: string
): Promise<ReportResult> {
  const response = await api.get(`/exams/rankings?classId=${classId}&term=${term}&academicYear=${academicYear}`);
  const data = response.data.data;
  const student = data.rankings.find((r: any) => r.studentId === studentId);

  if (!student) {
    throw new Error('Student not found in rankings');
  }

  const doc = new jsPDF({ format: 'a4' });
  renderStudentReportPage(doc, student, data.className, term, academicYear, data.totalStudents);
  addPageFooter(doc);

  const termLabel = TERM_LABELS[term] || term;
  return toReportResult(doc, `ReportCard_${student.studentName.replace(/\s+/g, '_')}_${termLabel}.pdf`);
}

/**
 * Generate report cards for ALL students in a class (one page per student)
 */
export async function generateBulkReportCards(
  classId: string,
  term: string,
  academicYear: string
): Promise<ReportResult> {
  const response = await api.get(`/exams/rankings?classId=${classId}&term=${term}&academicYear=${academicYear}`);
  const data = response.data.data;

  if (!data.rankings || data.rankings.length === 0) {
    throw new Error('No rankings data available');
  }

  const doc = new jsPDF({ format: 'a4' });

  data.rankings.forEach((student: any, index: number) => {
    if (index > 0) doc.addPage();
    renderStudentReportPage(doc, student, data.className, term, academicYear, data.totalStudents);
  });

  addPageFooter(doc);

  const termLabel = TERM_LABELS[term] || term;
  return toReportResult(doc, `ReportCards_${data.className}_${termLabel}_${academicYear}.pdf`);
}

/**
 * Generate class term ranking report (all students ranked in a table)
 */
export async function generateClassTermReport(
  classId: string,
  term: string,
  academicYear: string
): Promise<ReportResult> {
  const response = await api.get(`/exams/rankings?classId=${classId}&term=${term}&academicYear=${academicYear}`);
  const data = response.data.data;

  const doc = new jsPDF({ format: 'a4', orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(INSTITUTION_NAME, pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(`Class Term Report — ${data.className || ''}`, pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${TERM_LABELS[term] || term}  |  Academic Year: ${academicYear}`, pageWidth / 2, 31, { align: 'center' });
  doc.setTextColor(0);

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.8);
  doc.line(15, 35, pageWidth - 15, 35);

  // Summary stats
  const rankings = data.rankings || [];
  const totalStudents = rankings.length;
  const passCount = rankings.filter((r: any) => r.overallGrade !== 'F').length;
  const classAvgPct = totalStudents > 0
    ? (rankings.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / totalStudents).toFixed(1)
    : '0.0';
  const topper = rankings.length > 0 ? rankings[0] : null;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Students: ${totalStudents}`, 15, 42);
  doc.text(`Class Average: ${classAvgPct}%`, 80, 42);
  doc.text(`Pass Rate: ${totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(0) : 0}%`, 150, 42);
  if (topper) {
    doc.text(`Topper: ${topper.studentName} (${topper.percentage}%)`, 210, 42);
  }
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, 42, { align: 'right' });

  // Rankings table
  const tableBody = rankings.map((r: any) => [
    r.rank?.toString() || '-',
    r.studentName,
    r.admissionNumber,
    r.indexNumber || '-',
    `${r.totalObtained} / ${r.totalMax}`,
    `${r.percentage}%`,
    r.overallGrade,
    r.overallGrade === 'F' ? 'FAIL' : 'PASS',
  ]);

  autoTable(doc, {
    startY: 47,
    head: [['Rank', 'Student Name', 'Adm No', 'Index No', 'Total Marks', 'Percentage', 'Grade', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: { fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { halign: 'left', cellWidth: 55 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        if (data.column.index === 6) {
          const grade = data.cell.raw as string;
          data.cell.styles.textColor = getGradeColor(grade);
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 7) {
          const status = data.cell.raw as string;
          data.cell.styles.textColor = status === 'PASS' ? [16, 185, 129] : [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  addPageFooter(doc);

  const termLabel = TERM_LABELS[term] || term;
  return toReportResult(doc, `ClassReport_${data.className}_${termLabel}_${academicYear}.pdf`);
}

/**
 * Generate subject/exam report (per-exam performance)
 */
export async function generateSubjectReport(examId: string): Promise<ReportResult> {
  const response = await api.get(`/exams/${examId}/report`);
  const exam = response.data.data;

  if (!exam) throw new Error('Exam not found');

  const doc = new jsPDF({ format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(INSTITUTION_NAME, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Subject Performance Report', pageWidth / 2, 26, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${TERM_LABELS[exam.term] || exam.term}  |  Academic Year: ${exam.academicYear}`, pageWidth / 2, 33, { align: 'center' });
  doc.setTextColor(0);

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.8);
  doc.line(15, 37, pageWidth - 15, 37);

  // Exam info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Exam: ${exam.name}`, 15, 44);
  doc.text(`Subject: ${exam.subject}`, 15, 50);
  doc.text(`Class: ${exam.class?.name || ''}`, 110, 44);
  doc.text(`Total Marks: ${exam.totalMarks}  |  Pass Marks: ${exam.passingMarks}`, 110, 50);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, 44, { align: 'right' });

  // Stats
  const marks = exam.marks || [];
  const markValues = marks.map((m: any) => m.marksObtained);
  const avg = markValues.length > 0 ? (markValues.reduce((a: number, b: number) => a + b, 0) / markValues.length).toFixed(1) : '0';
  const highest = markValues.length > 0 ? Math.max(...markValues) : 0;
  const lowest = markValues.length > 0 ? Math.min(...markValues) : 0;
  const passCount = markValues.filter((m: number) => m >= exam.passingMarks).length;

  doc.setFillColor(245, 243, 255);
  doc.rect(15, 55, pageWidth - 30, 10, 'F');
  doc.setFontSize(9);
  doc.text(`Average: ${avg}`, 20, 62);
  doc.text(`Highest: ${highest}`, 65, 62);
  doc.text(`Lowest: ${lowest}`, 105, 62);
  doc.text(`Pass Rate: ${markValues.length > 0 ? ((passCount / markValues.length) * 100).toFixed(0) : 0}% (${passCount}/${markValues.length})`, 140, 62);

  // Student marks table (sorted by marksObtained DESC — already sorted from API)
  const tableBody = marks.map((m: any, i: number) => {
    const pct = exam.totalMarks > 0 ? ((m.marksObtained / exam.totalMarks) * 100).toFixed(1) : '0.0';
    const grade = calculateGrade(m.marksObtained, exam.totalMarks, exam.passingMarks);
    return [
      (i + 1).toString(),
      m.student?.fullName || '',
      m.student?.indexNumber || m.student?.admissionNumber || '',
      m.marksObtained.toString(),
      `${pct}%`,
      grade,
      m.marksObtained >= exam.passingMarks ? 'PASS' : 'FAIL',
    ];
  });

  autoTable(doc, {
    startY: 70,
    head: [['Rank', 'Student Name', 'Adm/Index No', 'Marks', '%', 'Grade', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: { fontSize: 9, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { halign: 'left', cellWidth: 55 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        if (data.column.index === 5) {
          const grade = data.cell.raw as string;
          data.cell.styles.textColor = getGradeColor(grade);
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 6) {
          const status = data.cell.raw as string;
          data.cell.styles.textColor = status === 'PASS' ? [16, 185, 129] : [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  addPageFooter(doc);
  return toReportResult(doc, `SubjectReport_${exam.subject || exam.name}_${exam.class?.name || ''}.pdf`);
}

// Helper (same as backend)
function calculateGrade(marksObtained: number, totalMarks: number, passingMarks: number): string {
  const percentage = (marksObtained / totalMarks) * 100;
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 50) return 'C';
  if (marksObtained >= passingMarks) return 'S';
  return 'F';
}
