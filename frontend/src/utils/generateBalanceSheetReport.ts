import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './helpers';
import { addReportHeader, addPageFooter, toReportResult, ReportResult } from './generateReports';

export async function generateBalanceSheetReport(data: any): Promise<ReportResult> {
  const doc = new jsPDF();
  const period = data.monthLabel;

  // 1. Title / Header
  addReportHeader(doc, 'Monthly Balance Sheet', 'Financial Statement', period);

  // 2. Summary Table
  const netText = data.netBalance >= 0 ? 'Surplus (Net Gain)' : 'Deficit (Net Loss)';
  autoTable(doc, {
    startY: 55,
    head: [['Financial Metric', 'Amount']],
    body: [
      ['Total Income', formatCurrency(data.income.total)],
      ['Total Expenditures', formatCurrency(data.expenditure.total)],
      [netText, formatCurrency(data.netBalance)],
      ['Previous Month Net Gain', formatCurrency(data.previousMonthNetGain || 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { fontStyle: 'bold' },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === 2) {
        // Highlight Net Balance
        if (data.netBalance >= 0) {
          cellData.cell.styles.textColor = [22, 163, 74]; // green
          cellData.cell.styles.fillColor = [240, 253, 244];
        } else {
          cellData.cell.styles.textColor = [220, 38, 38]; // red
          cellData.cell.styles.fillColor = [254, 242, 242];
        }
      } else if (cellData.section === 'body' && cellData.row.index === 3) {
        // Highlight Previous Month Net Gain
        const prevNet = data.previousMonthNetGain || 0;
        if (prevNet >= 0) {
          cellData.cell.styles.textColor = [22, 163, 74]; // green
          cellData.cell.styles.fillColor = [240, 253, 244];
        } else {
          cellData.cell.styles.textColor = [220, 38, 38]; // red
          cellData.cell.styles.fillColor = [254, 242, 242];
        }
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Category Breakdown Section Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('Category-wise Breakdown', 15, currentY);
  currentY += 5;

  // Prepare Income Category Breakdown Data
  const incomeBreakdowns: [string, number][] = [];
  const sFees = data.income.breakdown.studentFees;
  if (sFees.monthly > 0) incomeBreakdowns.push(['Student Fees - Monthly Hostel', sFees.monthly]);
  if (sFees.exam > 0) incomeBreakdowns.push(['Student Fees - Exam', sFees.exam]);
  if (sFees.admission > 0) incomeBreakdowns.push(['Student Fees - Admission', sFees.admission]);
  if (sFees.other > 0) incomeBreakdowns.push(['Student Fees - Other', sFees.other]);

  const donations = data.income.breakdown.donations;
  if (donations.donation > 0) incomeBreakdowns.push(['Donations - General', donations.donation]);
  if (donations.iftarDonation > 0) incomeBreakdowns.push(['Donations - Iftar', donations.iftarDonation]);

  const otherInc = data.income.breakdown.otherIncome;
  if (otherInc.fixedDepositProfit > 0) incomeBreakdowns.push(['Fixed Deposit Profit', otherInc.fixedDepositProfit]);
  if (otherInc.landShareRent > 0) incomeBreakdowns.push(['Land Share & Rent', otherInc.landShareRent]);
  if (otherInc.solarPanelProfit > 0) incomeBreakdowns.push(['Solar Panel Profit', otherInc.solarPanelProfit]);
  if (otherInc.almsBox > 0) incomeBreakdowns.push(['Alms Box', otherInc.almsBox]);
  if (otherInc.other > 0) incomeBreakdowns.push(['Other Income', otherInc.other]);

  // Prepare Expenditure Category Breakdown Data
  const expBreakdowns: [string, number][] = [];
  const expB = data.expenditure.breakdown;
  if (expB.cooking > 0) expBreakdowns.push(['Food & Bevarages Expenditures', expB.cooking]);
  if (expB.administration > 0) expBreakdowns.push(['Administrative Expenses', expB.administration]);
  if (expB.development > 0) expBreakdowns.push(['Development / Maintenance', expB.development]);
  if (expB.others > 0) expBreakdowns.push(['Other Expenses', expB.others]);

  // Display Income Breakdown
  autoTable(doc, {
    startY: currentY,
    head: [['Income Category', 'Amount', '% of Income']],
    body: incomeBreakdowns.length > 0 
      ? incomeBreakdowns.map(([cat, amt]) => [
          cat,
          formatCurrency(amt),
          data.income.total > 0 ? `${((amt / data.income.total) * 100).toFixed(1)}%` : '0%',
        ])
      : [['No income recorded', '-', '-']],
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Display Expenditure Breakdown
  autoTable(doc, {
    startY: currentY,
    head: [['Expenditure Category', 'Amount', '% of Expenses']],
    body: expBreakdowns.length > 0 
      ? expBreakdowns.map(([cat, amt]) => [
          cat,
          formatCurrency(amt),
          data.expenditure.total > 0 ? `${((amt / data.expenditure.total) * 100).toFixed(1)}%` : '0%',
        ])
      : [['No expenditures recorded', '-', '-']],
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // 4. Detailed Transactions Section Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('Detailed Income Transactions', 15, currentY);
  currentY += 5;

  // Income Transactions Table
  const incTx = data.income.transactions || [];
  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Payer/Source', 'Category', 'Method', 'Receipt No', 'Amount']],
    body: incTx.length > 0
      ? incTx.map((tx: any) => [
          formatDate(tx.date),
          tx.payerName || '-',
          tx.categoryLabel,
          tx.paymentMethod,
          tx.receiptNumber || '-',
          formatCurrency(tx.amount),
        ])
      : [['-', '-', 'No income transactions recorded for this period', '-', '-', '-']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Check if we need a new page for Expenditure Transactions Title
  if (currentY > doc.internal.pageSize.height - 40) {
    doc.addPage();
    currentY = 50;
  }

  // Expenditure Transactions Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('Detailed Expenditure Transactions', 15, currentY);
  currentY += 5;

  // Expenditure Transactions Table
  const expTx = data.expenditure.transactions || [];
  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Description', 'Category', 'Method', 'Bill/Vendor', 'Amount']],
    body: expTx.length > 0
      ? expTx.map((tx: any) => {
          const detail = [
            tx.vendor ? `Vendor: ${tx.vendor}` : '',
            tx.billNumber ? `Bill: ${tx.billNumber}` : '',
          ].filter(Boolean).join(', ') || '-';
          return [
            formatDate(tx.date),
            tx.description || '-',
            tx.categoryLabel,
            tx.paymentMethod,
            detail,
            formatCurrency(tx.amount),
          ];
        })
      : [['-', '-', 'No expenditure transactions recorded for this period', '-', '-', '-']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 25;

  // 5. Signature Lines
  if (currentY > doc.internal.pageSize.height - 45) {
    doc.addPage();
    currentY = 50;
  }

  doc.setDrawColor(200);
  doc.line(15, currentY, 80, currentY);
  doc.line(130, currentY, doc.internal.pageSize.width - 15, currentY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text('Prepared By (Finance Officer)', 15, currentY + 5);
  doc.text('Approved By (Principal)', 130, currentY + 5);

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Signature / Date', 15, currentY + 10);
  doc.text('Signature / Date', 130, currentY + 10);

  // 6. Footer and Page Numbers
  addPageFooter(doc);

  const filename = `Balance_Sheet_${data.month}.pdf`;
  return toReportResult(doc, filename);
}
