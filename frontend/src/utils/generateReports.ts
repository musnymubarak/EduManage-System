import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './helpers';
import api from '../services/api';

export interface ReportResult {
  blobUrl: string;
  filename: string;
}

function toReportResult(doc: jsPDF, filename: string): ReportResult {
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, filename };
}

// ============================================================
// Shared PDF helpers
// ============================================================

function addReportHeader(doc: jsPDF, title: string, subtitle: string, period: string) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SAMAIYA MADRASA', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, pageWidth / 2, 35, { align: 'center' });

  doc.setDrawColor(200);
  doc.line(15, 40, pageWidth - 15, 40);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Period: ${period}`, 15, 48);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, 48, { align: 'right' });
}

function addPageFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.text('EduManage System - Official Report', 15, pageHeight - 10);
  }
}

// ============================================================
// 1. ATTENDANCE REPORT
// ============================================================

export async function generateAttendanceReport(
  startDate: string,
  endDate: string,
  classId: string,
  className: string
): Promise<ReportResult> {
  // Fetch attendance data from backend
  const response = await api.get('/attendance/students', {
    params: { classId, startDate, endDate }
  });
  const records = response.data.data || [];

  if (records.length === 0) {
    throw new Error('No attendance records found for the selected date range and class.');
  }

  // Aggregate per student
  const studentMap = new Map<string, { name: string; admNo: string; present: number; absent: number; late: number; total: number }>();

  for (const r of records) {
    const sid = r.studentId;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        name: r.student?.fullName || 'Unknown',
        admNo: r.student?.admissionNumber || '-',
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      });
    }
    const entry = studentMap.get(sid)!;
    entry.total++;
    if (r.status === 'PRESENT') entry.present++;
    else if (r.status === 'ABSENT') entry.absent++;
    else if (r.status === 'LATE') entry.late++;
  }

  const students = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const totalPresent = students.reduce((s, st) => s + st.present, 0);
  const totalAbsent = students.reduce((s, st) => s + st.absent, 0);
  const totalLate = students.reduce((s, st) => s + st.late, 0);
  const totalRecords = students.reduce((s, st) => s + st.total, 0);

  // Build PDF
  const doc = new jsPDF();
  const period = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  addReportHeader(doc, 'Attendance Report', `Class: ${className}`, period);

  // Summary
  autoTable(doc, {
    startY: 55,
    head: [['Total Students', 'Total Present', 'Total Absent', 'Total Late', 'Attendance %']],
    body: [[
      students.length.toString(),
      totalPresent.toString(),
      totalAbsent.toString(),
      totalLate.toString(),
      totalRecords > 0 ? `${((totalPresent / totalRecords) * 100).toFixed(1)}%` : '0%',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { halign: 'center' },
  });

  // Detail table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['#', 'Student Name', 'Adm. No', 'Present', 'Absent', 'Late', 'Total Days', 'Attendance %']],
    body: students.map((s, i) => [
      (i + 1).toString(),
      s.name,
      s.admNo,
      s.present.toString(),
      s.absent.toString(),
      s.late.toString(),
      s.total.toString(),
      s.total > 0 ? `${((s.present / s.total) * 100).toFixed(1)}%` : '0%',
    ]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const pctStr = data.cell.raw as string;
        const pct = parseFloat(pctStr);
        if (pct >= 90) data.cell.styles.textColor = [22, 163, 74];
        else if (pct >= 75) data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  addPageFooter(doc);

  return toReportResult(doc, `Attendance_Report_${className.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`);
}

// ============================================================
// 2. FEE COLLECTION REPORT
// ============================================================

export async function generateFeeCollectionReport(startDate: string, endDate: string): Promise<ReportResult> {
  const response = await api.get('/fees/report', {
    params: { startDate, endDate }
  });
  const { data: payments, summary } = response.data;

  if (!payments || payments.length === 0) {
    throw new Error('No fee payment records found for the selected date range.');
  }

  const doc = new jsPDF('landscape');
  const period = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  addReportHeader(doc, 'Fee Collection Report', 'All Classes', period);

  // Summary
  autoTable(doc, {
    startY: 55,
    head: [['Total Payments', 'Total Expected', 'Total Collected', 'Total Pending', 'Collection Rate']],
    body: [[
      summary.count.toString(),
      formatCurrency(summary.totalAmount),
      formatCurrency(summary.totalPaid),
      formatCurrency(summary.totalBalance),
      summary.totalAmount > 0 ? `${((summary.totalPaid / summary.totalAmount) * 100).toFixed(1)}%` : '0%',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    styles: { halign: 'center' },
  });

  // Detail table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['#', 'Student Name', 'Adm. No', 'Class', 'Fee Type', 'Amount', 'Paid', 'Balance', 'Status', 'Payment Date']],
    body: payments.map((p: any, i: number) => [
      (i + 1).toString(),
      p.student?.fullName || '-',
      p.student?.admissionNumber || '-',
      p.student?.class?.name || '-',
      p.feeType || '-',
      formatCurrency(p.amount),
      formatCurrency(p.paidAmount),
      formatCurrency(p.balance),
      p.status,
      p.paymentDate ? formatDate(p.paymentDate) : '-',
    ]),
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      7: { fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const status = data.cell.raw as string;
        if (status === 'PAID') data.cell.styles.textColor = [22, 163, 74];
        else if (status === 'PARTIAL') data.cell.styles.textColor = [217, 119, 6];
        else if (status === 'PENDING') data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  addPageFooter(doc);

  return toReportResult(doc, `Fee_Collection_Report_${startDate}_to_${endDate}.pdf`);
}

// ============================================================
// 3. EXAM RESULTS REPORT (uses student data since no exam API)
// ============================================================

export async function generateExamResultsReport(
  startDate: string,
  endDate: string,
  term: string
): Promise<ReportResult> {
  // Fetch student data to produce a term-based class roster report
  const studentsRes = await api.get('/students');
  const students = studentsRes.data?.data || [];

  if (students.length === 0) {
    throw new Error('No student records found to generate exam report.');
  }

  const termLabel = term.replace(/_/g, ' ');

  const doc = new jsPDF();
  const period = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  addReportHeader(doc, `Exam Results Report - ${termLabel}`, 'All Classes', period);

  // Group by class
  const classMap = new Map<string, any[]>();
  for (const s of students) {
    const cn = s.class?.name || 'Unassigned';
    if (!classMap.has(cn)) classMap.set(cn, []);
    classMap.get(cn)!.push(s);
  }

  // Summary
  autoTable(doc, {
    startY: 55,
    head: [['Term', 'Total Students', 'Total Classes']],
    body: [[
      termLabel,
      students.length.toString(),
      classMap.size.toString(),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
    styles: { halign: 'center' },
  });

  // Student roster per class
  let startY = (doc as any).lastAutoTable.finalY + 10;

  for (const [className, classStudents] of classMap) {
    // Class header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(88, 28, 135);

    if (startY > doc.internal.pageSize.height - 40) {
      doc.addPage();
      startY = 20;
    }

    doc.text(`Class: ${className} (${classStudents.length} students)`, 15, startY);

    autoTable(doc, {
      startY: startY + 5,
      head: [['#', 'Student Name', 'Adm. No', 'Index No', 'Status']],
      body: classStudents.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName)).map((s: any, i: number) => [
        (i + 1).toString(),
        s.fullName,
        s.admissionNumber,
        s.indexNumber || '-',
        s.status,
      ]),
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const st = data.cell.raw as string;
          if (st === 'ACTIVE') data.cell.styles.textColor = [22, 163, 74];
          else data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });

    startY = (doc as any).lastAutoTable.finalY + 12;
  }

  doc.setTextColor(0);
  addPageFooter(doc);

  return toReportResult(doc, `Exam_Report_${termLabel.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`);
}

// ============================================================
// 4. FINANCIAL REPORT
// ============================================================

export async function generateFinancialReport(startDate: string, endDate: string): Promise<ReportResult> {
  // Fetch fee report for date range context
  await api.get('/fees/report', {
    params: { startDate, endDate }
  });

  // Also fetch all general ledger payments
  const ledgerRes = await api.get('/fees/payments');
  const allLedger = ledgerRes.data?.data || [];

  // Filter ledger by date range
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  rangeEnd.setHours(23, 59, 59, 999);

  const ledgerInRange = allLedger.filter((t: any) => {
    const d = new Date(t.paymentDate || t.createdAt);
    return d >= rangeStart && d <= rangeEnd;
  });

  // Group by fee type
  const feeTypeMap = new Map<string, { count: number; collected: number; pending: number }>();
  for (const p of ledgerInRange) {
    const ft = p.feeType || 'OTHER';
    if (!feeTypeMap.has(ft)) feeTypeMap.set(ft, { count: 0, collected: 0, pending: 0 });
    const entry = feeTypeMap.get(ft)!;
    entry.count++;
    entry.collected += p.paidAmount || 0;
    entry.pending += p.balance || 0;
  }

  const totalIncome = ledgerInRange.reduce((s: number, p: any) => s + (p.paidAmount || 0), 0);
  const totalPending = ledgerInRange.reduce((s: number, p: any) => s + (p.balance || 0), 0);

  const doc = new jsPDF();
  const period = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  addReportHeader(doc, 'Financial Report', 'Income Summary', period);

  // Financial summary
  autoTable(doc, {
    startY: 55,
    head: [['Total Income (Collected)', 'Total Pending', 'Total Transactions', 'Net Balance']],
    body: [[
      formatCurrency(totalIncome),
      formatCurrency(totalPending),
      ledgerInRange.length.toString(),
      formatCurrency(totalIncome - totalPending),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
    styles: { halign: 'center' },
  });

  // Breakdown by fee type
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Fee Type', 'Transactions', 'Collected', 'Pending']],
    body: Array.from(feeTypeMap.entries()).map(([type, data]) => [
      type,
      data.count.toString(),
      formatCurrency(data.collected),
      formatCurrency(data.pending),
    ]),
    headStyles: { fillColor: [245, 158, 11], textColor: 255 },
    alternateRowStyles: { fillColor: [255, 251, 235] },
  });

  // Detailed transaction list
  if (ledgerInRange.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['#', 'Date', 'Student', 'Fee Type', 'Receipt', 'Collected', 'Balance', 'Status']],
      body: ledgerInRange.map((t: any, i: number) => [
        (i + 1).toString(),
        formatDate(t.paymentDate || t.createdAt),
        t.student?.fullName || '-',
        t.feeType || '-',
        t.receiptNumber || '-',
        formatCurrency(t.paidAmount || 0),
        formatCurrency(t.balance || 0),
        t.status || '-',
      ]),
      headStyles: { fillColor: [234, 88, 12], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const st = data.cell.raw as string;
          if (st === 'PAID') data.cell.styles.textColor = [22, 163, 74];
          else if (st === 'PARTIAL') data.cell.styles.textColor = [217, 119, 6];
          else if (st === 'PENDING') data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });
  }

  addPageFooter(doc);

  return toReportResult(doc, `Financial_Report_${startDate}_to_${endDate}.pdf`);
}
