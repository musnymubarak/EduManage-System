import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  Search, 
  Plus, 
  AlertCircle, 
  FileText, 
  Printer, 
  CheckCircle2,
  TrendingUp,
  Calendar,
  History,
  Pencil,
  Settings2,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import { generatePaymentReportPDF } from '../utils/generatePaymentReport';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';
import GlobalPaymentModal from '../components/Finance/GlobalPaymentModal';
import GlobalHistoryModal from '../components/Finance/GlobalHistoryModal';
import { ActionMenu } from '../components/UI/ActionMenu';
import logo from '../logo.png';

const FeesPage: React.FC = () => {
  // --- States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  
  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGlobalPaymentModalOpen, setIsGlobalPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFeeSettingModalOpen, setIsFeeSettingModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<any>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Date Handling
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const queryClient = useQueryClient();

  // --- Month Helpers ---
  const monthOptions = useMemo(() => {
    const options = [];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Show 12 months starting from current and back
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        options.push({ value: val, label });
    }
    return options;
  }, []);

  const currentMonthLabel = useMemo(() => {
    return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
  }, [selectedMonth, monthOptions]);

  // --- Queries ---
  
  // 1. Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });
  const classes = classesData?.data || [];

  // 2. Fetch Monthly Status
  const { data: trackerData, isLoading } = useQuery({
    queryKey: ['feesMonthlyStatus', selectedMonth, selectedClass, searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('month', selectedMonth);
      if (selectedClass) params.append('classId', selectedClass);
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      
      const response = await api.get(`/fees/monthly-status?${params}`);
      return response.data;
    },
  });

  const studentsStatus = trackerData?.data || [];

  // 3. Mutation to update system setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await api.post('/settings', { key, value });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Fee setting updated successfully');
      queryClient.invalidateQueries({ queryKey: ['feesMonthlyStatus'] });
      setIsFeeSettingModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update setting');
    },
  });

  const handleUpdateGlobalFee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = formData.get('amount') as string;
    if (amount) {
      updateSettingMutation.mutate({ key: 'monthly_fee_amount', value: amount });
    }
  };
  const summary = trackerData?.summary || { 
      totalStudents: 0, 
      paid: 0, 
      partial: 0, 
      pending: 0,
      totalExpectedAmount: 0,
      totalCollectedAmount: 0,
      totalOutstandingAmount: 0,
      totalArrears: 0,
      grandTotalOutstanding: 0
  };

  const deleteFeePaymentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fees/payments/${id}`),
    onSuccess: () => {
      toast.success('Payment record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['feesMonthlyStatus'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete payment');
    },
  });

  const handleDeleteFeePayment = (row: any) => {
    if (window.confirm(`Are you sure you want to delete this payment for "${row.fullName}"? This action cannot be undone.`)) {
      deleteFeePaymentMutation.mutate(row.paymentId);
    }
  };

  // --- Handlers ---
  const handleRecordPayment = (row: any) => {
    setSelectedStudent(row);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (row: any) => {
    if (row.paymentId) {
        setEditingPayment(row);
        setIsEditModalOpen(true);
    }
  };

  const handleViewReceipt = (row: any) => {
     if (row.paymentId) {
        api.get(`/fees/payments`).then((res) => {
            const allPayments = res.data.data;
            const fullFee = allPayments.find((f: any) => f.id === row.paymentId);
            if (fullFee) {
                setSelectedFee(fullFee);
                setIsReceiptModalOpen(true);
            } else {
                toast.error('Could not load specific receipt details');
            }
        });
    }
  };

  const handlePrintStatement = (row: any) => {
     setSelectedStudentForReport(row);
     setIsStatementModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between py-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Student Fee Management</h2>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2 truncate">
            <Calendar size={16} className="text-blue-500" />
            Tracking status for <span className="text-blue-600 font-bold">{currentMonthLabel}</span>
          </p>
        </div>
        <div className="flex flex-row items-center gap-3 shrink-0 flex-nowrap">
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
            onClick={() => generatePaymentReportPDF(
              studentsStatus, 
              summary, 
              { 
                className: classes.find((c: any) => c.id === selectedClass)?.name || 'All Classes',
                monthLabel: currentMonthLabel,
                statusFilter: statusFilter
              }
            )} 
            className="shadow-sm h-12 rounded-2xl font-bold border-gray-100 px-6 hover:bg-gray-50 flex items-center gap-2 transition-all whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100"
          >
            <Printer size={18} className="text-indigo-400 shrink-0" />
            Report
          </Button>
          <Button 
            variant="secondary"
            onClick={() => setIsFeeSettingModalOpen(true)}
            className="h-12 px-6 rounded-2xl flex items-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100 shadow-sm transition-all hover:scale-105 whitespace-nowrap"
          >
            <Settings2 size={18} className="shrink-0" />
            <span className="font-medium text-sm">Manage Student Fee</span>
          </Button>
          <Button 
            onClick={() => setIsGlobalPaymentModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="font-medium text-sm">Record Student Fee</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Summary Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Expected */}
        <Card
          className="group relative overflow-hidden bg-gradient-to-r from-[#2563eb] to-[#4f46e5] border-none shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.98] border border-white/10"
          padding="none"
        >
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/[0.04] pointer-events-none" />
          
          <div className="flex items-center justify-between gap-3 relative z-10 p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/80 tracking-wider uppercase">Total Expected</p>
              <h3 className="mt-1 text-2xl font-black text-white tracking-tight">{formatCurrency(summary.totalExpectedAmount)}</h3>
              <p className="text-xs text-white/70 mt-1 font-medium">For {summary.totalStudents} Active Students</p>
            </div>
            <div className="relative flex-shrink-0 flex items-center justify-center h-12 w-12">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
                <DollarSign size={20} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        </Card>

        {/* Total Collected */}
        <Card
          className="group relative overflow-hidden bg-gradient-to-r from-[#10b981] to-[#0d9488] border-none shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.98] border border-white/10"
          padding="none"
        >
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/[0.04] pointer-events-none" />
          
          <div className="flex items-center justify-between gap-3 relative z-10 p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/80 tracking-wider uppercase">Total Collected</p>
              <h3 className="mt-1 text-2xl font-black text-white tracking-tight">{formatCurrency(summary.totalCollectedAmount)}</h3>
              <p className="text-xs text-white/70 mt-1 font-medium">{summary.paid} Fully Paid</p>
            </div>
            <div className="relative flex-shrink-0 flex items-center justify-center h-12 w-12">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
                <CheckCircle2 size={20} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        </Card>

        {/* Outstanding */}
        <Card
          className="group relative overflow-hidden bg-gradient-to-r from-[#ef4444] to-[#db2777] border-none shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.98] border border-white/10"
          padding="none"
        >
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/[0.04] pointer-events-none" />
          
          <div className="flex items-center justify-between gap-3 relative z-10 p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/80 tracking-wider uppercase">Outstanding</p>
              <h3 className="mt-1 text-2xl font-black text-white tracking-tight">{formatCurrency(summary.totalOutstandingAmount)}</h3>
              <p className="text-xs text-white/70 mt-1 font-medium">{summary.partial + summary.pending} Pending</p>
            </div>
            <div className="relative flex-shrink-0 flex items-center justify-center h-12 w-12">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
                <AlertCircle size={20} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        </Card>

        {/* Arrears (Prior Months) */}
        <Card
          className="group relative overflow-hidden bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] border-none shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.98] border border-white/10"
          padding="none"
        >
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/[0.04] pointer-events-none" />

          <div className="flex items-center justify-between gap-3 relative z-10 p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/80 tracking-wider uppercase">Arrears</p>
              <h3 className="mt-1 text-2xl font-black text-white tracking-tight">{formatCurrency(summary.totalArrears || 0)}</h3>
              <p className="text-xs text-white/70 mt-1 font-medium">From previous months</p>
            </div>
            <div className="relative flex-shrink-0 flex items-center justify-center h-12 w-12">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
                <TrendingUp size={20} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-sm border-gray-100">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-6 items-end">
          <div className="md:col-span-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Class</label>
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={[{ value: '', label: 'All Classes' }, ...classes.map((c: any) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Month</label>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={monthOptions}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Search Students</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Name or Admission Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>
          <div className="md:col-span-4 lg:col-span-2">
             <div className="flex w-full gap-1 bg-gray-100 p-1 rounded-xl shadow-inner">
                {(['ALL', 'PAID', 'PARTIAL', 'PENDING'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === status
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {status === 'ALL' ? 'Show All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden border-none shadow-xl rounded-2xl">
        {isLoading ? (
          <div className="py-24 text-center">
             <div className="inline-block relative">
                <div className="h-20 w-20 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <DollarSign size={24} className="text-blue-600" />
                </div>
             </div>
            <p className="text-gray-500 mt-4 font-bold tracking-widest uppercase text-xs">Accessing Student Ledger...</p>
          </div>
        ) : studentsStatus.length === 0 ? (
          <div className="py-32 text-center">
             <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 text-gray-300 shadow-inner">
                <Search size={48} />
             </div>
             <h3 className="text-xl font-black text-gray-900">No records found</h3>
             <p className="text-gray-500 mt-2">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-28">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Student Identity</th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Class</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Monthly Fee</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Paid</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wide text-red-600 bg-red-50/30">Arrears</th>
                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50/30">Total Owed</th>
                  <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {studentsStatus.map((row: any) => (
                  <tr key={row.studentId} className="group hover:bg-blue-50/20 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 font-black text-blue-700 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {row.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{row.fullName}</div>
                          <div className="text-[11px] font-bold text-blue-600 tracking-wider">ID: {row.indexNumber || row.admissionNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="info" className="px-3 py-1 font-black text-[10px] tracking-widest uppercase">{row.className}</Badge>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-gray-900 text-sm">
                      {formatCurrency(row.totalAmount)}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-green-600 text-sm">
                      {formatCurrency(row.paidAmount)}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-red-500 text-sm bg-red-50/20">
                      {formatCurrency(row.previousArrears)}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-blue-700 text-base bg-blue-50/20">
                      {formatCurrency(row.totalOutstanding)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Badge
                        variant={
                          row.paymentStatus === 'PAID'
                            ? 'success'
                            : row.paymentStatus === 'PARTIAL'
                            ? 'warning'
                            : 'danger'
                        }
                        className="min-w-[90px] text-center font-bold text-[10px] uppercase tracking-wider py-1"
                      >
                        {row.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end">
                        <ActionMenu items={[
                          { label: row.paymentStatus === 'PENDING' ? 'Collect' : 'Resume', icon: <DollarSign size={15} />, onClick: () => handleRecordPayment(row), disabled: row.paymentStatus === 'PAID' },
                          { label: 'Receipt', icon: <FileText size={15} />, onClick: () => handleViewReceipt(row), hidden: !row.paymentId },
                          { label: 'Print Statement', icon: <Printer size={15} />, onClick: () => handlePrintStatement(row) },
                          { label: 'Correction', icon: <Pencil size={15} />, onClick: () => handleEditPayment(row), hidden: !row.paymentId },
                          { label: 'Delete', icon: <Trash2 size={15} />, onClick: () => handleDeleteFeePayment(row), variant: 'danger', hidden: !row.paymentId },
                        ]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --- Modals --- */}

      {/* Record Payment Modal */}
      {selectedStudent && (
        <RecordPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
                setIsPaymentModalOpen(false);
                setSelectedStudent(null);
                queryClient.invalidateQueries({ queryKey: ['feesMonthlyStatus'] });
            }}
            student={selectedStudent}
            defaultMonth={selectedMonth}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
            isOpen={isEditModalOpen}
            onClose={() => {
                setIsEditModalOpen(false);
                setEditingPayment(null);
                queryClient.invalidateQueries();
            }}
            paymentMini={editingPayment}
        />
      )}

      {/* Global History */}
      <GlobalHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Global New Payment Modal */}
      <GlobalPaymentModal
        isOpen={isGlobalPaymentModalOpen}
        onClose={() => {
          setIsGlobalPaymentModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['feesMonthlyStatus'] });
        }}
        defaultMonth={selectedMonth}
      />

      {/* Professional Receipt View */}
      {selectedFee && (
        <FeeReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => {
                setIsReceiptModalOpen(false);
                setSelectedFee(null);
            }}
            fee={selectedFee}
        />
      )}

      {/* Student Statement View */}
      {selectedStudentForReport && (
        <StudentStatementModal
            isOpen={isStatementModalOpen}
            onClose={() => {
                setIsStatementModalOpen(false);
                setSelectedStudentForReport(null);
            }}
            studentId={selectedStudentForReport.studentId}
        />
      )}
      {/* Fee Setting Modal */}
      <Modal
        isOpen={isFeeSettingModalOpen}
        onClose={() => setIsFeeSettingModalOpen(false)}
        title="Global Monthly Student Fee Setting"
        size="sm"
      >
        <form onSubmit={handleUpdateGlobalFee} className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <div>
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  Updating this value will affect all <span className="font-black text-amber-900 underline">FUTURE</span> payments and students who have <span className="font-black text-amber-900 underline">NOT YET PAID</span> for this month.
                </p>
                <p className="text-[10px] text-amber-600 mt-2 italic">
                  Note: The system now snapshots the fee at the time of payment. Students who already paid at the old rate will remain marked as PAID.
                </p>
              </div>
            </div>
          </div>

          <Input 
            label="Monthly Student Fee Amount (LKR)" 
            name="amount" 
            type="number" 
            step="0.01" 
            required 
            defaultValue={summary?.monthlyFeePerStudent || '13000'}
            placeholder="e.g. 13000" 
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsFeeSettingModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={updateSettingMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 font-medium text-sm px-8 h-12 rounded-xl"
            >
              {updateSettingMutation.isPending ? 'Updating...' : 'Update Student Fee Amount'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// --- Sub-Components & Modals ---

// Record Payment Modal
const RecordPaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; student: any; defaultMonth: string }> = ({
  isOpen, onClose, student, defaultMonth
}) => {
  const [formData, setFormData] = useState({
    amount: student.totalAmount.toString(),
    paidAmount: (student.totalAmount - student.paidAmount).toString(),
    paymentMethod: 'CASH',
    remarks: '',
  });

  const queryClient = useQueryClient();

  const recordMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/fees/payments', {
        studentId: student.studentId,
        feeType: 'MONTHLY',
        month: defaultMonth,
        amount: parseFloat(formData.amount),
        paidAmount: parseFloat(formData.paidAmount),
        paymentMethod: formData.paymentMethod,
        remarks: formData.remarks,
        dueDate: new Date(defaultMonth + '-05').toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Fee successfully recorded');
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Execution failed');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Entry Collection" size="md">
      <div className="mb-6 rounded-2xl bg-gray-50 p-6 border border-gray-100 flex justify-between items-center shadow-inner">
           <div>
              <p className="text-xs font-medium text-gray-500">Student</p>
              <p className="text-xl font-black text-gray-900">{student.fullName}</p>
              <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">{student.className}</p>
           </div>
           <div className="text-right">
              <p className="text-xs font-medium text-gray-500">Target Period</p>
              <p className="text-xl font-black text-blue-900">{defaultMonth}</p>
           </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <Input label="System Student Fee (LKR)" value={formData.amount} readOnly className="bg-gray-50 font-bold" />
          <Input
            label="Collection Now (LKR)"
            type="number"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
            required
            autoFocus
            className="font-black border-blue-200"
          />
        </div>

        <Select
          label="Method of Payment"
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'ONLINE', label: 'Online Gateway' },
          ]}
        />

        <Input
          label="Optional Remarks"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="e.g., Parent requested late processing"
        />

        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
          <Button variant="secondary" onClick={onClose} className="font-bold border-none hover:bg-gray-100">Cancel</Button>
          <Button onClick={handleSubmit} disabled={recordMutation.isPending} className="bg-blue-600 hover:bg-blue-700 shadow-lg px-8 py-2.5 font-semibold">
            {recordMutation.isPending ? 'Verifying...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Payment Modal
const EditPaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; paymentMini: any }> = ({
    isOpen, onClose, paymentMini
}) => {
    const [formData, setFormData] = useState({
        amount: paymentMini.totalAmount.toString(),
        paidAmount: paymentMini.paidAmount.toString(),
        paymentMethod: 'CASH', // We'll update this if we fetch the full object
        remarks: '',
    });

    const queryClient = useQueryClient();

    // Fetch full detail for editing
    const { data: fullData, isLoading } = useQuery({
        queryKey: ['feeDetails', paymentMini.paymentId],
        queryFn: async () => {
            const res = await api.get('/fees/payments');
            return res.data.data.find((f: any) => f.id === paymentMini.paymentId);
        },
        enabled: isOpen,
    });

    React.useEffect(() => {
        if (fullData) {
            setFormData({
                amount: fullData.amount.toString(),
                paidAmount: fullData.paidAmount.toString(),
                paymentMethod: fullData.paymentMethod || 'CASH',
                remarks: fullData.remarks || '',
            });
        }
    }, [fullData]);

    const editMutation = useMutation({
        mutationFn: async () => {
            const res = await api.put(`/fees/payments/${paymentMini.paymentId}`, {
                amount: parseFloat(formData.amount),
                paidAmount: parseFloat(formData.paidAmount),
                paymentMethod: formData.paymentMethod,
                remarks: formData.remarks,
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Record corrected successfully');
            queryClient.invalidateQueries();
            onClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Correction failed');
        }
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Correct Entry" size="md">
            {isLoading ? <p className="py-10 text-center font-bold">Fetching record details...</p> : (
            <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }} className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3">
                    <AlertCircle className="text-orange-500 shrink-0" size={20} />
                    <p className="text-xs text-orange-700 font-medium">Use this to correct data entry errors. Ensure all changes are authorized by the bursar.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Correct Total Fee" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        type="number"
                    />
                    <Input 
                        label="Correct Amount Paid" 
                        value={formData.paidAmount} 
                        onChange={(e) => setFormData({...formData, paidAmount: e.target.value})}
                        type="number"
                    />
                </div>

                <Select
                    label="Payment Method"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    options={[
                        { value: 'CASH', label: 'Vault (Cash)' },
                        { value: 'BANK_TRANSFER', label: 'Direct Transfer' },
                        { value: 'ONLINE', label: 'Online Gateway' },
                        { value: 'CHEQUE', label: 'Cheque' },
                    ]}
                />

                <Input 
                    label="Correction Reason" 
                    placeholder="Why are you editing this?"
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                />

                <div className="mt-8 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} className="font-bold">Discard</Button>
                    <Button type="submit" disabled={editMutation.isPending} className="bg-orange-600 hover:bg-orange-700 font-black px-6 shadow-md">
                        {editMutation.isPending ? 'Saving...' : 'Perform Correction'}
                    </Button>
                </div>
            </form>
            )}
        </Modal>
    );
};


const ReceiptContent: React.FC<{ fee: any; nextDueDateLabel: string; copyLabel?: string }> = ({ fee, nextDueDateLabel, copyLabel }) => (
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
                <p className="text-[10px] font-black text-slate-900 uppercase">{fee.student.fullName}</p>
                <p className="text-[9px] font-semibold text-blue-800">ID: {fee.student.indexNumber || fee.student.admissionNumber}</p>
                <p className="text-[9px] font-medium text-slate-500">Class: {fee.student.class?.name || 'N/A'}</p>
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
                            <p className="text-[10px] font-black text-slate-800 uppercase">{fee.feeType} FEE COLLECTION</p>
                            <p className="text-[8px] text-slate-400 mt-1 uppercase">Period: {fee.month}</p>
                        </td>
                        <td className="px-3 py-4 text-right text-[10px] font-black text-slate-800 align-top">
                            {formatCurrency(fee.paidAmount)}
                        </td>
                    </tr>
                    {/* Placeholder empty rows to give it the "invoice" look if height allows */}
                    <tr className="h-12">
                        <td className="border-r border-slate-100"></td>
                        <td className="border-r border-slate-100"></td>
                        <td></td>
                    </tr>
                </tbody>
                <tfoot className="border-t border-slate-200">
                    <tr>
                        <td colSpan={2} className="px-3 py-2 text-right text-[9px] font-black text-slate-500 uppercase">Total Paid</td>
                        <td className="px-3 py-2 text-right text-[11px] font-black text-blue-900">{formatCurrency(fee.paidAmount)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-4">
            <p className="text-[8px] font-black text-slate-800 uppercase mb-1">Terms & Conditions</p>
            <ul className="text-[7px] text-slate-500 space-y-0.5 list-disc pl-3">
                <li>Payment is non-refundable once the official receipt is generated.</li>
                <li>Please keep this document for future administrative verifications.</li>
                <li>Next due date for fees is on or before <span className="font-bold text-slate-700">{nextDueDateLabel}</span>.</li>
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
                <p className="text-[8px] font-black text-slate-900 uppercase">Authorized Signature</p>
            </div>
        </div>
    </div>
  </div>
);

const FeeReceiptModal: React.FC<{ isOpen: boolean; onClose: () => void; fee: any }> = ({ isOpen, onClose, fee }) => {
  const handlePrint = () => window.print();
  if (!fee) return null;
  
  // Calculate next due date (5th of next month)
  const currentMonthDate = new Date(fee.month + '-01');
  const nextMonthDate = new Date(currentMonthDate.setMonth(currentMonthDate.getMonth() + 1));
  const nextDueDateLabel = `${nextMonthDate.toLocaleString('default', { month: 'long' })} 05, ${nextMonthDate.getFullYear()}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt Print Preview" size="lg" footer={
        <div className="flex justify-end gap-3 no-print p-4 bg-gray-50 border-t rounded-b-2xl">
            <Button variant="secondary" onClick={onClose} className="font-bold border-none">Close Portal</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 shadow-md font-black px-6">
                <Printer size={18} className="mr-2" /> 
                Print (1/4 A4)
            </Button>
        </div>
    }>
        {/* VIEW IN MODAL (Single Preview) */}
        <div className="no-print p-6 bg-gray-100 min-h-[400px] flex justify-center">
            <div className="shadow-2xl scale-90 origin-top">
                <ReceiptContent fee={fee} nextDueDateLabel={nextDueDateLabel} copyLabel="Official Receipt" />
            </div>
        </div>

        {/* PRINT LAYOUT (Hidden from UI, 1/4 of A4) */}
        <div id="receipt-print-grid" className="hidden print:block print:w-[210mm] print:h-[297mm] print:bg-white">
            <ReceiptContent fee={fee} nextDueDateLabel={nextDueDateLabel} copyLabel="Official Receipt" />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print, header, nav, footer, aside, .modal-overlay, .modal-content-wrapper { display: none !important; }
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

const StatementContent: React.FC<{ student: any; summary: any; monthlyLedger: any[]; otherPayments: any[]; logo: any }> = ({
  student, summary, monthlyLedger, otherPayments, logo
}) => {
  return (
    <div className="flex flex-col justify-between h-full min-h-full">
      <div>
        {/* Institutional Header */}
        <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-xl font-black text-blue-950 uppercase tracking-tight">SUMAIYA LADIES ARABIC COLLEGE</h1>
              <p className="text-xs font-bold text-blue-800 tracking-wider">Munaichchenai, Kinniya 31100, Sri Lanka</p>
              <p className="text-[10px] text-gray-500 font-medium">Phone: 0262 236 033 | Email: sumaiyaladiescollege@gmail.com</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-xs font-black rounded-lg border border-red-100 uppercase tracking-widest">
              OFFICIAL STATEMENT
            </span>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Generated: {new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-base font-extrabold text-gray-900 tracking-wider uppercase border-b border-gray-150 pb-2">Student Fee Statement of Account</h2>
        </div>

        {/* Student details grid */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-150 mb-6 text-xs">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Student Name</p>
            <p className="font-extrabold text-gray-800 text-sm">{student.fullName}</p>
            <p className="text-[10px] text-blue-700 font-bold mt-1 uppercase tracking-wider">Class: {student.className}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Admission / Index Details</p>
            <p className="font-extrabold text-gray-800">Adm No: {student.admissionNumber}</p>
            {student.indexNumber && <p className="text-xs font-bold text-gray-600">Index No: {student.indexNumber}</p>}
            <p className="text-[9px] text-gray-500 font-semibold mt-1">Admission Date: {new Date(student.admissionDate).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Summary Card Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-150 rounded-xl p-3 bg-gray-50/50">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Expected Tuition</p>
            <p className="text-base font-black text-gray-900 mt-1">{formatCurrency(summary.totalExpected)}</p>
          </div>
          <div className="border border-gray-150 rounded-xl p-3 bg-emerald-50/30">
            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Total Paid Amount</p>
            <p className="text-base font-black text-green-700 mt-1">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="border-2 border-red-200 rounded-xl p-3 bg-red-50/30">
            <p className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Total Arrears Owed</p>
            <p className="text-base font-black text-red-700 mt-1">{formatCurrency(summary.grandTotalOwed)}</p>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monthly Fee Breakdown & Status</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-bold text-gray-600">Period / Month</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-600">Expected</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-600">Paid</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-600">Balance</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-600">Status</th>
                  <th className="px-3 py-2 font-bold text-gray-600">Transaction Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {monthlyLedger.map((row: any) => {
                  const hasArrears = row.balance > 0;
                  const monthDate = new Date(row.month + '-01');
                  const monthLabel = monthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                  
                  return (
                    <tr key={row.month} className={`${hasArrears ? 'bg-red-50/20' : 'bg-white'}`}>
                      <td className="px-3 py-2 font-extrabold text-gray-900">{monthLabel}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(row.expectedAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(row.paidAmount)}</td>
                      <td className={`px-3 py-2 text-right font-extrabold ${hasArrears ? 'text-red-600 bg-red-50/30' : 'text-gray-800'}`}>
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          row.status === 'PAID' 
                            ? 'bg-green-100 text-green-800' 
                            : row.status === 'PARTIAL' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {row.status === 'MISSING' ? 'UNPAID' : row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-[10px]">
                        {row.receiptNumber ? (
                          <div className="font-semibold text-gray-700">
                            <span>Receipt: {row.receiptNumber}</span>
                            {row.paymentDate && <span className="block text-[9px] text-gray-400 font-normal">Paid: {formatDate(row.paymentDate)}</span>}
                          </div>
                        ) : (
                          <span className="italic text-gray-400">No payment record</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Fees Section (only if relevant) */}
        {otherPayments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Other Fee Transactions</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-bold text-gray-600">Date</th>
                    <th className="px-3 py-2 font-bold text-gray-600">Description</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600">Expected</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600">Paid</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600">Balance</th>
                    <th className="px-3 py-2 font-bold text-gray-600">Receipt No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {otherPayments.map((row: any) => (
                    <tr key={row.id} className={row.balance > 0 ? 'bg-red-50/20' : 'bg-white'}>
                      <td className="px-3 py-2 text-gray-700">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{row.remarks || row.feeType}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(row.paidAmount)}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-gray-800">{formatCurrency(row.balance)}</td>
                      <td className="px-3 py-2 font-mono text-gray-600 text-[10px]">{row.receiptNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer & Signatures */}
      <div className="border-t border-gray-200 pt-6 mt-8">
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-2 text-[10px] text-gray-500 leading-normal">
            <h4 className="font-bold text-gray-700 uppercase tracking-wider">Statement Information</h4>
            <p>1. This is a computer-generated statement of outstanding arrears. No physical signature is required unless requested.</p>
            <p>2. Please clear all pending arrears as soon as possible to avoid administrative holds or restrictions.</p>
            <p>3. Payments can be settled via Cash at the administration office or Bank Transfer to our official accounts.</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <div className="w-48 border-b border-gray-300 ml-auto mb-1 h-12"></div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Authorized Signature / Stamp</p>
            <p className="text-[10px] text-gray-400 mt-1">Sumaiya Ladies Arabic College Accounts Office</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentStatementModal: React.FC<{ isOpen: boolean; onClose: () => void; studentId: string }> = ({
  isOpen, onClose, studentId
}) => {
  const handlePrint = () => window.print();

  const { data: ledgerResponse, isLoading, error } = useQuery({
    queryKey: ['studentLedger', studentId],
    queryFn: async () => {
      const response = await api.get(`/fees/student/${studentId}/ledger`);
      return response.data;
    },
    enabled: isOpen && !!studentId,
  });

  if (!isOpen) return null;

  const ledgerData = ledgerResponse?.data;
  const student = ledgerData?.student;
  const summary = ledgerData?.summary;
  const monthlyLedger = ledgerData?.monthlyLedger || [];
  const otherPayments = ledgerData?.otherPayments || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Arrears Statement" size="xl" footer={
        <div className="flex justify-end gap-3 no-print p-4 bg-gray-50 border-t rounded-b-2xl">
            <Button variant="secondary" onClick={onClose} className="font-bold border-none">Close</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 shadow-md font-black px-6">
                <Printer size={18} className="mr-2" /> 
                Print Statement
            </Button>
        </div>
    }>
        {isLoading ? (
          <div className="py-24 text-center">
             <div className="inline-block relative">
                <div className="h-16 w-16 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin"></div>
             </div>
             <p className="text-gray-500 mt-4 font-bold tracking-widest uppercase text-xs">Generating Ledger Statement...</p>
          </div>
        ) : error || !ledgerData ? (
          <div className="py-12 text-center text-red-500 font-bold">
             Failed to load student ledger details. Please try again.
          </div>
        ) : (
          <>
             {/* SCREEN PREVIEW CONTAINER */}
             <div className="no-print p-4 bg-gray-100 rounded-xl overflow-x-auto">
                 <div className="bg-white shadow-lg mx-auto border border-gray-200 p-8 text-slate-800" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}>
                      <StatementContent student={student} summary={summary} monthlyLedger={monthlyLedger} otherPayments={otherPayments} logo={logo} />
                 </div>
             </div>

             {/* PRINT LAYOUT CONTAINER */}
             <div id="arrears-print-page" className="hidden print:block print:bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                 <StatementContent student={student} summary={summary} monthlyLedger={monthlyLedger} otherPayments={otherPayments} logo={logo} />
             </div>
          </>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print, header, nav, footer, aside, .modal-overlay, .modal-content-wrapper { display: none !important; }
          #arrears-print-page { 
            display: block !important;
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100% !important; 
            z-index: 99999;
            background: white !important;
            visibility: visible !important;
          }
          #arrears-print-page * { visibility: visible !important; }
        }
      `}} />
    </Modal>
  );
};

export default FeesPage;
