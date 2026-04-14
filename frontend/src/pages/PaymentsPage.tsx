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
  History,
  Info
} from 'lucide-react';
import api from '../services/api';
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
const FeeReceiptModal: React.FC<{ isOpen: boolean; onClose: () => void; fee: any }> = ({ isOpen, onClose, fee }) => {
    const handlePrint = () => window.print();
    if (!fee) return null;
    
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Administrative Document" size="lg" footer={
          <div className="flex justify-end gap-3 no-print p-4 bg-gray-50 border-t rounded-b-2xl">
              <Button variant="secondary" onClick={onClose} className="font-bold border-none">Close</Button>
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 shadow-md font-black px-6">
                  <Printer size={18} className="mr-2" /> 
                  Authorize Print
              </Button>
          </div>
      }>
          <div className="bg-white p-12 text-gray-900" id="receipt-content">
              {/* Branding */}
              <div className="flex justify-between items-start border-b-4 border-double border-gray-900 pb-10 mb-10">
                  <div className="flex gap-6 items-center">
                      <div className="h-20 w-20 bg-gray-900 rounded-2xl flex items-center justify-center p-2">
                          <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                          <h1 className="text-4xl font-black tracking-tighter">SUMAYA MADRASA</h1>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Institutional Financial Record</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-sm font-black text-blue-600 tracking-tighter bg-blue-50 px-3 py-1 rounded-lg inline-block mb-2">No: {fee.receiptNumber}</p>
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Transaction Date</p>
                      <p className="text-sm font-black">{formatDate(fee.paymentDate || fee.createdAt)}</p>
                  </div>
              </div>
  
              {/* Identity */}
              <div className="grid grid-cols-2 gap-12 mb-12">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3">Student Particulars</p>
                     <p className="text-2xl font-black text-gray-900 mb-1 leading-none">{fee.student?.fullName}</p>
                     <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">ID: {fee.student?.admissionNumber}</p>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3">Classification</p>
                     <p className="text-xl font-bold text-gray-900 mb-1">{fee.feeType} FEE</p>
                     {fee.month && <p className="text-sm font-medium text-gray-600 italic">Period: {fee.month}</p>}
                     <p className="text-xs font-black text-blue-600 mt-2 uppercase">Method: {fee.paymentMethod}</p>
                  </div>
              </div>
  
              {/* Financials */}
              <div className="border-2 border-gray-900 rounded-3xl overflow-hidden mb-12">
                  <table className="w-full text-left">
                      <thead className="bg-gray-900 text-white">
                          <tr>
                              <th className="p-6 text-xs font-black uppercase tracking-widest">Description</th>
                              <th className="p-6 text-right text-xs font-black uppercase tracking-widest">Value (LKR)</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td className="p-6">
                                  <p className="font-bold text-lg text-gray-900">Standard {fee.feeType} Assessment / Collection</p>
                                  <p className="text-xs text-gray-500 mt-1">Steward: {fee.collector?.fullName || 'Academic Staff'}</p>
                              </td>
                              <td className="p-6 text-right font-black text-xl text-gray-900">{formatCurrency(fee.amount)}</td>
                          </tr>
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-900">
                          <tr>
                              <td className="p-6 text-right text-xs font-black uppercase tracking-widest">Net Paid Amount</td>
                              <td className="p-6 text-right text-3xl font-black text-green-600">{formatCurrency(fee.paidAmount)}</td>
                          </tr>
                      </tfoot>
                  </table>
              </div>
  
              {/* Stewardship */}
              <div className="grid grid-cols-2 gap-8 items-end">
                  <div>
                      <Info size={16} className="text-blue-500 mb-2" />
                      <p className="text-xs text-gray-500 uppercase font-black tracking-widest italic mb-4">Official Document — Sumaya Management</p>
                      {fee.remarks && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border-l-4 border-gray-200">Memo: {fee.remarks}</p>
                      )}
                  </div>
                  <div className="text-right">
                        <div className="mb-10 inline-block text-center border-b-2 border-gray-900 pb-1 w-64 h-16 flex flex-col justify-end">
                             <p className="text-sm font-black italic text-blue-900/40">Authorized by Bursar</p>
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-900">Official Signature</p>
                  </div>
              </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: white !important; margin: 0 !important; padding: 0 !important; }
            .no-print, aside, header, nav { display: none !important; }
            #receipt-content { position: fixed; top: 0; left: 0; width: 100vw; padding: 40px !important; z-index: 9999; visibility: visible !important; }
            #receipt-content * { visibility: visible !important; }
          }
        `}} />
      </Modal>
    );
};

export default PaymentsPage;
