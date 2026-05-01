import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './helpers';

interface StudentFeeStatus {
  studentId: string;
  admissionNumber: string;
  fullName: string;
  className: string;
  month: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  previousArrears: number;
  totalOutstanding: number;
}

interface FeeSummary {
  totalStudents: number;
  paid: number;
  partial: number;
  pending: number;
  totalExpectedAmount: number;
  totalCollectedAmount: number;
  totalOutstandingAmount: number;
  totalArrears: number;
  grandTotalOutstanding: number;
}

interface ReportFilters {
  className: string;
  monthLabel: string;
  statusFilter: string;
}

export function generatePaymentReportPDF(
  students: StudentFeeStatus[],
  summary: FeeSummary,
  filters: ReportFilters
) {
  const doc = new jsPDF('landscape'); // Switching to landscape for more columns
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SAMAIYA MADRASA', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Fee Collection Report (Cumulative)', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });

  // Filter Info
  doc.setDrawColor(200);
  doc.line(15, 40, pageWidth - 15, 40);
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Class: ${filters.className || 'All Classes'}`, 15, 48);
  doc.text(`Month: ${filters.monthLabel}`, pageWidth / 2, 48, { align: 'center' });
  doc.text(`Status: ${filters.statusFilter}`, pageWidth - 15, 48, { align: 'right' });

  // Summary Table
  autoTable(doc, {
    startY: 55,
    head: [['Students', 'Current Expected', 'Current Collected', 'Current Bal.', 'Prev. Arrears', 'GRAND TOTAL OWED']],
    body: [[
      summary.totalStudents.toString(),
      formatCurrency(summary.totalExpectedAmount),
      formatCurrency(summary.totalCollectedAmount),
      formatCurrency(summary.totalOutstandingAmount),
      formatCurrency(summary.totalArrears),
      formatCurrency(summary.grandTotalOutstanding)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
    styles: { halign: 'center' }
  });

  // Student Details Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['#', 'Student Name', 'Adm. No', 'Class', 'Monthly Fee', 'Paid', 'Bal.', 'Arrears', 'TOTAL OWED', 'Status']],
    body: students.map((s, index) => [
      (index + 1).toString(),
      s.fullName,
      s.admissionNumber,
      s.className,
      formatCurrency(s.totalAmount),
      formatCurrency(s.paidAmount),
      formatCurrency(s.balance),
      formatCurrency(s.previousArrears),
      formatCurrency(s.totalOutstanding),
      s.paymentStatus
    ]),
    headStyles: { fillColor: [63, 81, 181], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 10 },
    columnStyles: {
      7: { fontStyle: 'bold', textColor: [198, 40, 40] }, // Arrears in Red
      8: { fontStyle: 'bold', textColor: [63, 81, 181] }   // Total Owed in Blue
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const status = data.cell.raw as string;
        if (status === 'PAID') data.cell.styles.textColor = [46, 125, 50]; // Green
        if (status === 'PARTIAL') data.cell.styles.textColor = [239, 108, 0]; // Orange
        if (status === 'PENDING') data.cell.styles.textColor = [198, 40, 40]; // Red
      }
    }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, doc.internal.pageSize.height - 10, { align: 'right' });
    doc.text('EduManage System - Official Financial Document', 15, doc.internal.pageSize.height - 10);
  }

  // Save PDF
  const filename = `Fee_Report_${filters.className.replace(/\s+/g, '_')}_${filters.monthLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
