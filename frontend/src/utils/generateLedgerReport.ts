import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './helpers';

interface Transaction {
  id: string;
  paymentDate: string;
  createdAt: string;
  feeType: string;
  receiptNumber: string;
  paidAmount: number;
  remarks?: string;
  student?: {
    fullName: string;
    admissionNumber: string;
  };
}

interface LedgerFilters {
  searchQuery: string;
  feeTypeFilter: string;
}

export function generateLedgerReportPDF(
  transactions: Transaction[],
  filters: LedgerFilters
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SAMAIYA MADRASA', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('General Ledger Report', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });

  // Filter Info
  doc.setDrawColor(200);
  doc.line(15, 40, pageWidth - 15, 40);
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Type: ${filters.feeTypeFilter}`, 15, 48);
  if (filters.searchQuery) {
    doc.text(`Search: ${filters.searchQuery}`, pageWidth / 2, 48, { align: 'center' });
  }
  
  const totalCollected = transactions.reduce((sum, t) => sum + t.paidAmount, 0);
  doc.text(`Total Volume: ${transactions.length}`, pageWidth - 15, 48, { align: 'right' });

  // Summary Table
  autoTable(doc, {
    startY: 55,
    head: [['Total Transactions', 'Total Collected']],
    body: [[
      transactions.length.toString(),
      formatCurrency(totalCollected)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
    styles: { halign: 'center' }
  });

  // Transaction Details Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Date', 'Student Name', 'ID', 'Fee Type', 'Receipt', 'Amount']],
    body: transactions.map((t) => [
      formatDate(t.paymentDate || t.createdAt),
      t.student?.fullName || 'N/A',
      t.student?.admissionNumber || 'N/A',
      t.feeType,
      t.receiptNumber || '—',
      formatCurrency(t.paidAmount)
    ]),
    headStyles: { fillColor: [48, 63, 159], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 10 }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, doc.internal.pageSize.height - 10, { align: 'right' });
    doc.text('EduManage System - Centralized Financial Ledger', 15, doc.internal.pageSize.height - 10);
  }

  // Save PDF
  const filename = `Ledger_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
