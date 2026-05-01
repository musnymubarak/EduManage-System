import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Printer, 
  Calendar,
  ArrowDownLeft,
  LayoutGrid,
  History
} from 'lucide-react';
import api from '../services/api';
import { generateLedgerReportPDF } from '../utils/generateLedgerReport';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';
import logo from '../logo.png';
import GlobalPaymentModal from '../components/Finance/GlobalPaymentModal';
import GlobalHistoryModal from '../components/Finance/GlobalHistoryModal';

const PaymentsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [feeTypeFilter, setFeeTypeFilter] = useState('ALL');
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const queryClient = useQueryClient();

    // Date for defaultMonth
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Fetch Ledger (All recorded payments)
    const { data: ledgerData, isLoading } = useQuery({
        queryKey: ['feeLedger', searchQuery, feeTypeFilter],
        queryFn: async () => {
            const response = await api.get('/fees/payments');
            let data = response.data.data || [];
            
            // Filter by type if not ALL
            if (feeTypeFilter !== 'ALL') {
                data = data.filter((p: any) => p.feeType === feeTypeFilter);
            }
            
            // Filter by search (Student name or receipt)
            if (searchQuery) {
                const s = searchQuery.toLowerCase();
                data = data.filter((p: any) => 
                    p.student?.fullName?.toLowerCase().includes(s) || 
                    p.receiptNumber?.toLowerCase().includes(s) ||
                    p.student?.admissionNumber?.toLowerCase().includes(s)
                );
            }

            return data;
        },
    });

    const transactions = ledgerData || [];

    const handlePrintReceipt = (payment: any) => {
        setSelectedReceipt(payment);
        setIsReceiptModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Payments Portal</h2>
                    <p className="text-gray-500 mt-1 font-medium flex items-center gap-2 truncate">
                        <History size={16} className="text-blue-500" />
                        Centralized Financial Ledger & Accounting
                    </p>
                </div>
                <div className="flex gap-3 items-center flex-nowrap shrink-0">
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsHistoryModalOpen(true)} 
                        className="shadow-sm h-12 rounded-2xl font-bold border-gray-100 px-6 hover:bg-gray-50 flex items-center gap-2 transition-all whitespace-nowrap"
                    >
                        <History size={18} className="text-gray-400 shrink-0" />
                        Full History
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => generateLedgerReportPDF(
                            transactions, 
                            { 
                                searchQuery,
                                feeTypeFilter
                            }
                        )} 
                        className="shadow-sm h-12 rounded-2xl font-bold border-gray-100 px-6 hover:bg-gray-50 flex items-center gap-2 transition-all whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100"
                    >
                        <Printer size={18} className="text-indigo-400 shrink-0" />
                        Export Ledger
                    </Button>
                    <Button 
                        onClick={() => setIsRecordModalOpen(true)} 
                        className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                        <span className="font-black uppercase tracking-widest text-[11px]">Record Student Fee</span>
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white border-none shadow-lg border-l-4 border-l-blue-600">
                    <div className="flex justify-between items-start pt-1">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Gross Collected</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(transactions.reduce((acc: number, t: any) => acc + t.paidAmount, 0))}</h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 shadow-inner">
                            <ArrowDownLeft size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white border-none shadow-lg border-l-4 border-l-indigo-600">
                    <div className="flex justify-between items-start pt-1">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Volume</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{transactions.length}</h3>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner">
                            <LayoutGrid size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white border-none shadow-lg border-l-4 border-l-emerald-600">
                    <div className="flex justify-between items-start pt-1">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Monthly Fees</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">
                                {formatCurrency(transactions.filter((t: any) => t.feeType === 'MONTHLY').reduce((acc: number, t: any) => acc + t.paidAmount, 0))}
                            </h3>
                        </div>
                        <div className="bg-teal-50 p-3 rounded-2xl text-emerald-600 shadow-inner">
                            <Calendar size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white border-none shadow-lg border-l-4 border-l-orange-600">
                    <div className="flex justify-between items-start pt-1">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Other Collections</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">
                                {formatCurrency(transactions.filter((t: any) => t.feeType !== 'MONTHLY').reduce((acc: number, t: any) => acc + t.paidAmount, 0))}
                            </h3>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 shadow-inner">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Audit Search & Classification */}
            <Card className="shadow-sm border-gray-100 p-0 overflow-hidden border-none shadow-xl rounded-2xl">
                <div className="flex flex-col md:flex-row gap-4 items-end p-6 border-b border-gray-50 bg-white">
                    <div className="flex-1">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Audit Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Student Name, ID or Receipt Number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Classification</label>
                        <Select
                            value={feeTypeFilter}
                            onChange={(e) => setFeeTypeFilter(e.target.value)}
                            options={[
                                { value: 'ALL', label: 'All Transactions' },
                                { value: 'MONTHLY', label: 'Monthly Tuition' },
                                { value: 'ADMISSION', label: 'Admission Fees' },
                                { value: 'EXAM', label: 'Exam Fees' },
                                { value: 'OTHER', label: 'Misc. Collections' }
                            ]}
                            className="bg-gray-50 border-none rounded-xl"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400 font-bold animate-pulse">Synchronizing Ledger...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-left">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Timestamp</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Student</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Fee Type</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Receipt</th>
                                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Collected</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Toolbox</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {transactions.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-blue-50/10 transition-colors">
                                        <td className="px-8 py-4 whitespace-nowrap">
                                            <p className="text-sm font-bold text-gray-900">{formatDate(t.paymentDate || t.createdAt)}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Auto-recorded</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                                                    {t.student?.fullName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 leading-none">{t.student?.fullName}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">ID: {t.student?.admissionNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge 
                                                variant={t.feeType === 'MONTHLY' ? 'info' : t.feeType === 'EXAM' ? 'warning' : 'success'} 
                                                className="text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase truncate max-w-[120px]"
                                                title={t.remarks || t.feeType}
                                            >
                                                {t.feeType === 'OTHER' && t.remarks?.startsWith('Other: ') 
                                                    ? t.remarks.split('|')[0].replace('Other: ', '').trim() 
                                                    : t.feeType}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-black text-blue-600 tracking-tighter">
                                            {t.receiptNumber || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900 text-sm">
                                            {formatCurrency(t.paidAmount)}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button
                                                onClick={() => handlePrintReceipt(t)}
                                                className="p-2 rounded-lg hover:bg-white hover:text-blue-600 transition-all text-gray-300 hover:shadow-sm"
                                                title="Print Secure Receipt"
                                            >
                                                <Printer size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* SHARED UNIFIED MODALS */}
            <GlobalPaymentModal
                isOpen={isRecordModalOpen}
                onClose={() => {
                    setIsRecordModalOpen(false);
                    queryClient.invalidateQueries();
                }}
                defaultMonth={currentMonth}
            />

            <GlobalHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
            />

            {/* Shared Receipt Modal */}
            {selectedReceipt && (
                <FeeReceiptModal 
                    isOpen={isReceiptModalOpen} 
                    onClose={() => {
                        setIsReceiptModalOpen(false);
                        setSelectedReceipt(null);
                    }} 
                    fee={selectedReceipt} 
                />
            )}
        </div>
    );
};

// --- Receipt Modal Component ---
const ReceiptContent: React.FC<{ fee: any; copyLabel?: string }> = ({ fee, copyLabel }) => (
  <div className="receipt-content-body bg-white p-6 text-slate-800 border border-slate-200 relative flex flex-col justify-between overflow-hidden shadow-sm" style={{ height: '148.5mm', width: '105mm', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}>
    {/* Blue Accent Triangle (Stylized) */}
    <div className="absolute top-0 left-0 w-12 h-12 bg-blue-900" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
    
    {copyLabel && (
      <div className="absolute top-2 right-4 text-[6px] font-bold text-slate-300 uppercase tracking-widest">
        {copyLabel}
      </div>
    )}

    <div>
        {/* HEADER SECTION */}
        <div className="flex justify-between items-start mb-6 pt-2">
            <div className="mt-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">RECEIPT</h2>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                    <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
                    <h1 className="text-[11px] font-black text-blue-900 uppercase">Sumaiya Ladies Arabic College</h1>
                </div>
            </div>
        </div>

        {/* INFO GRID */}
        <div className="flex justify-between gap-4 mb-6">
            <div className="flex-1">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt To :</p>
                <p className="text-[10px] font-black text-slate-900 uppercase">{fee.student?.fullName}</p>
                <p className="text-[9px] font-medium text-slate-500">ID: {fee.student?.admissionNumber}</p>
            </div>
            <div className="text-right">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Details</p>
                <p className="text-[9px] font-bold text-slate-700">Receipt No: <span className="font-black text-slate-900">{fee.receiptNumber}</span></p>
                <p className="text-[9px] font-bold text-slate-700">Date: <span className="font-black text-slate-900">{formatDate(fee.paymentDate || fee.createdAt)}</span></p>
                <p className="text-[9px] font-bold text-slate-700 uppercase mt-1">Method: {fee.paymentMethod}</p>
            </div>
        </div>

        {/* MAIN TABLE */}
        <div className="border border-slate-200 rounded-sm mb-4">
            <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-200">
                    <tr>
                        <th className="px-3 py-2 text-[8px] font-black text-blue-900 uppercase tracking-widest border-r border-slate-100">Date</th>
                        <th className="px-3 py-2 text-[8px] font-black text-blue-900 uppercase tracking-widest border-r border-slate-100">Description</th>
                        <th className="px-3 py-2 text-right text-[8px] font-black text-blue-900 uppercase tracking-widest">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr className="min-h-[80px]">
                        <td className="px-3 py-4 text-[9px] font-medium text-slate-600 border-r border-slate-100 align-top">
                            {formatDate(fee.paymentDate || fee.createdAt)}
                        </td>
                        <td className="px-3 py-4 border-r border-slate-100 align-top">
                            <p className="text-[10px] font-black text-slate-800 uppercase">{fee.feeType} COLLECTION</p>
                            <p className="text-[8px] text-slate-400 mt-1 uppercase">Ref: Academic Records</p>
                        </td>
                        <td className="px-3 py-4 text-right text-[10px] font-black text-slate-800 align-top">
                            {formatCurrency(fee.paidAmount)}
                        </td>
                    </tr>
                    <tr className="h-12">
                        <td className="border-r border-slate-100"></td>
                        <td className="border-r border-slate-100"></td>
                        <td></td>
                    </tr>
                </tbody>
                <tfoot className="border-t border-slate-200">
                    <tr>
                        <td colSpan={2} className="px-3 py-2 text-right text-[9px] font-black text-slate-500 uppercase">Total Amount</td>
                        <td className="px-3 py-2 text-right text-[11px] font-black text-blue-900">{formatCurrency(fee.paidAmount)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-4">
            <p className="text-[8px] font-black text-slate-800 uppercase mb-1">Notice</p>
            <ul className="text-[7px] text-slate-500 space-y-0.5 list-disc pl-3">
                <li>Payment acknowledged. Please keep this for your records.</li>
                <li>System generated receipt, no physical signature required for internal use.</li>
            </ul>
        </div>
    </div>

    {/* FOOTER SECTION */}
    <div className="border-t border-slate-100 pt-4 mt-auto">
        <div className="flex justify-between items-end">
            <div className="max-w-[150px]">
                <p className="text-[8px] font-black text-blue-900 uppercase mb-1">Contact Us</p>
                <p className="text-[7px] text-slate-500 leading-tight">munaichchenai, Kinniya 31100</p>
                <p className="text-[7px] text-slate-500">Phone: 0262 236 033</p>
                <p className="text-[6px] text-slate-300 mt-2 uppercase">System Gen: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="text-right">
                <div className="w-32 border-b border-slate-300 h-8 mb-1 ml-auto"></div>
                <p className="text-[8px] font-black text-slate-900 uppercase">Official Signature</p>
            </div>
        </div>
    </div>
  </div>
);

const FeeReceiptModal: React.FC<{ isOpen: boolean; onClose: () => void; fee: any }> = ({ isOpen, onClose, fee }) => {
    const handlePrint = () => window.print();
    if (!fee) return null;
    
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Administrative Document" size="lg" footer={
          <div className="flex justify-end gap-3 no-print p-4 bg-gray-50 border-t rounded-b-2xl">
              <Button variant="secondary" onClick={onClose} className="font-bold border-none">Close</Button>
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 shadow-md font-black px-6">
                  <Printer size={18} className="mr-2" /> 
                  Print (1/4 A4)
              </Button>
          </div>
      }>
          {/* VIEW IN MODAL (Single Preview) */}
          <div className="no-print p-6 bg-gray-100 min-h-[400px] flex justify-center">
              <div className="shadow-2xl scale-90 origin-top">
                  <ReceiptContent fee={fee} copyLabel="Official Receipt" />
              </div>
          </div>

          {/* PRINT LAYOUT (Hidden from UI, 1/4 of A4) */}
          <div id="receipt-print-grid" className="hidden print:block print:w-[210mm] print:h-[297mm] print:bg-white">
              <ReceiptContent fee={fee} copyLabel="Official Receipt" />
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 0; }
            body { background: white !important; margin: 0 !important; padding: 0 !important; }
            .no-print, aside, header, nav, footer, .modal-overlay, .modal-content-wrapper { display: none !important; }
            #receipt-print-grid { 
              display: block !important;
              position: fixed; 
              top: 0; 
              left: 0; 
              width: 210mm; 
              height: 297mm; 
              z-index: 99999;
              background: white !important;
              visibility: visible !important;
            }
            #receipt-print-grid * { visibility: visible !important; }
          }
        `}} />
      </Modal>
    );
};

export default PaymentsPage;
