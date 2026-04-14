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
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Pencil,
  Info
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';
import GlobalPaymentModal from '../components/Finance/GlobalPaymentModal';
import GlobalHistoryModal from '../components/Finance/GlobalHistoryModal';
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
  const summary = trackerData?.summary || { 
      totalStudents: 0, 
      paid: 0, 
      partial: 0, 
      pending: 0,
      totalExpectedAmount: 0,
      totalCollectedAmount: 0,
      totalOutstandingAmount: 0
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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between py-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Fee Management</h2>
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
            onClick={() => setIsGlobalPaymentModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="font-black uppercase tracking-widest text-[11px]">Record Student Fee</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Summary Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-none shadow-lg transform transition-transform hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Total Expected</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(summary.totalExpectedAmount)}</h3>
              <p className="text-xs text-gray-400 mt-1">For {summary.totalStudents} Active Students</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-inner">
              <DollarSign size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-lg transform transition-transform hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-500">Total Collected</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(summary.totalCollectedAmount)}</h3>
              <p className="text-xs text-gray-400 mt-1">{summary.paid} Fully Paid</p>
            </div>
            <div className="bg-green-100 p-3 rounded-2xl text-green-600 shadow-inner">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-none shadow-lg transform transition-transform hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-500">Outstanding</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(summary.totalOutstandingAmount)}</h3>
              <p className="text-xs text-gray-400 mt-1">{summary.partial + summary.pending} Pending</p>
            </div>
            <div className="bg-red-100 p-3 rounded-2xl text-red-600 shadow-inner">
              <AlertCircle size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-none shadow-lg transform transition-transform hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Collection Rate</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">
                {summary.totalExpectedAmount > 0 
                  ? Math.round((summary.totalCollectedAmount / summary.totalExpectedAmount) * 100)
                  : 0}%
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden shadow-inner">
                <div 
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${summary.totalExpectedAmount > 0 ? (summary.totalCollectedAmount/summary.totalExpectedAmount)*100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shadow-inner">
              <Clock size={24} />
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Student Identity</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Class</th>
                  <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-widest text-gray-400">Monthly Fee</th>
                  <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-widest text-gray-400">Amount Paid</th>
                  <th className="px-6 py-5 text-center text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-widest text-gray-400">Control</th>
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
                          <div className="text-[11px] font-bold text-gray-400 tracking-wider">ID: {row.admissionNumber}</div>
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
                      <div className="flex justify-end gap-2.5">
                        {row.paymentId && (
                           <>
                             <button
                               onClick={() => handleViewReceipt(row)}
                               className="p-2.5 rounded-xl bg-white border border-gray-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-md"
                               title="Receipt"
                             >
                               <FileText size={16} />
                             </button>
                             <button
                               onClick={() => handleEditPayment(row)}
                               className="p-2.5 rounded-xl bg-white border border-gray-100 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm hover:shadow-md"
                               title="Correction"
                             >
                               <Pencil size={16} />
                             </button>
                           </>
                        )}
                        <button
                          onClick={() => handleRecordPayment(row)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-lg ${
                            row.paymentStatus === 'PAID'
                             ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-none'
                             : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                          }`}
                          disabled={row.paymentStatus === 'PAID'}
                        >
                          <DollarSign size={14} />
                          {row.paymentStatus === 'PENDING' ? 'Collect' : 'Resume'}
                        </button>
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
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Student</p>
              <p className="text-xl font-black text-gray-900">{student.fullName}</p>
              <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">{student.className}</p>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Target Period</p>
              <p className="text-xl font-black text-blue-900">{defaultMonth}</p>
           </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <Input label="System Fee (LKR)" value={formData.amount} readOnly className="bg-gray-50 font-bold" />
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
          <Button onClick={handleSubmit} disabled={recordMutation.isPending} className="bg-blue-600 hover:bg-blue-700 shadow-lg px-8 py-2.5 font-black uppercase tracking-widest">
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
                        { value: 'BANK_TRANSFER', label: 'E-Transfer' },
                        { value: 'OTHER', label: 'Other' },
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


const FeeReceiptModal: React.FC<{ isOpen: boolean; onClose: () => void; fee: any }> = ({ isOpen, onClose, fee }) => {
  const handlePrint = () => window.print();
  if (!fee) return null;
  
  // Calculate next due date (5th of next month)
  const currentMonthDate = new Date(fee.month + '-01');
  const nextMonthDate = new Date(currentMonthDate.setMonth(currentMonthDate.getMonth() + 1));
  const nextDueDateLabel = `${nextMonthDate.toLocaleString('default', { month: 'long' })} 05, ${nextMonthDate.getFullYear()}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Document Viewer" size="lg" footer={
        <div className="flex justify-end gap-3 no-print p-4 bg-gray-50 border-t rounded-b-2xl">
            <Button variant="secondary" onClick={onClose} className="font-bold border-none">Close Portal</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 shadow-md font-black px-6">
                <Printer size={18} className="mr-2" /> 
                Authorize Print
            </Button>
        </div>
    }>
        <div className="receipt-container bg-white p-12 text-gray-900 shadow-inner" id="receipt-content">
            {/* BRANDING HEADER */}
            <div className="flex justify-between items-start border-b-4 border-double border-gray-900 pb-10 mb-10">
                <div className="flex gap-6 items-center">
                    <div className="h-20 w-20 bg-gray-900 rounded-2xl flex items-center justify-center p-2">
                        <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-gray-900">SAMAIYA MADRASA</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Institutional Financial Record</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-blue-600 tracking-tighter bg-blue-50 px-3 py-1 rounded-lg inline-block mb-2">No: {fee.receiptNumber}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Date of Transaction</p>
                    <p className="text-sm font-black">{formatDate(fee.paymentDate || fee.createdAt)}</p>
                </div>
            </div>
            
            {/* IDENTITY SECTION */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3">Student Particulars</p>
                   <p className="text-2xl font-black text-gray-900 mb-1 leading-none">{fee.student.fullName}</p>
                   <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">ID: {fee.student.admissionNumber}</p>
                   <div className="mt-4 pt-4 border-t border-gray-200">
                       <Badge variant="info" className="font-bold tracking-widest uppercase text-[9px]">Class: {fee.student.class?.name || 'N/A'}</Badge>
                   </div>
                </div>
                <div className="flex flex-col justify-end text-right">
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3">Payment Classification</p>
                   <p className="text-xl font-bold text-gray-900 mb-1">{fee.feeType} Fee</p>
                   <p className="text-sm font-medium text-gray-600">Period: {fee.month}</p>
                   <p className="text-xs font-black text-blue-600 mt-2">METHOD: {fee.paymentMethod}</p>
                </div>
            </div>

            {/* FINANCIAL BREAKDOWN */}
            <div className="border-2 border-gray-900 rounded-3xl overflow-hidden mb-12">
                <table className="w-full text-left">
                    <thead className="bg-gray-900 text-white">
                        <tr>
                            <th className="p-6 text-xs font-black uppercase tracking-widest">Description of Fee</th>
                            <th className="p-6 text-right text-xs font-black uppercase tracking-widest">Value (LKR)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="p-6">
                                <p className="font-bold text-lg text-gray-900">{fee.feeType} Tuition / Administrative Dues</p>
                                <p className="text-xs text-gray-500 mt-1">Academic Cycle: {fee.academicYear}</p>
                            </td>
                            <td className="p-6 text-right font-black text-xl text-gray-900">{formatCurrency(fee.amount)}</td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Total Amount Paid</td>
                            <td className="px-6 py-4 text-right text-2xl font-black text-green-600">{formatCurrency(fee.paidAmount)}</td>
                        </tr>
                        {fee.balance > 0 && (
                            <tr className="border-t-2 border-double border-gray-200">
                                <td className="px-6 py-5 text-right font-black text-sm text-red-600 uppercase tracking-[0.2em]">Outstanding Balance</td>
                                <td className="px-6 py-5 text-right text-4xl font-black text-red-600">{formatCurrency(fee.balance)}</td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            {/* FOOTER & SIGNATURE */}
            <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50">
                <div className="grid grid-cols-2 gap-8 items-end">
                    <div>
                        <div className="mb-6 flex gap-3 items-center">
                            <Info size={16} className="text-blue-500" />
                            <p className="text-sm font-bold text-blue-900">Next Monthly Installment Due: <span className="text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">{nextDueDateLabel}</span></p>
                        </div>
                        {fee.remarks && (
                            <div className="mb-6">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Official Memoranda</p>
                                <p className="text-xs text-gray-600 font-medium italic">"{fee.remarks}"</p>
                            </div>
                        )}
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">System Generated: {new Date().toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <div className="mb-10 inline-block text-center border-b-2 border-gray-900 pb-1 w-64 h-16 flex flex-col justify-end">
                             <p className="text-sm font-black italic text-blue-900/40">Auth: {fee.collector?.fullName || 'Academic Staff'}</p>
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-900">Authorized Signature</p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Accounting Department — Samaiya Madrasa</p>
                    </div>
                </div>
            </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print, header, nav, footer, aside { display: none !important; }
          #receipt-content { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100vw; 
            height: auto; 
            margin: 0 !important; 
            padding: 40px !important; 
            z-index: 9999;
            background: white !important;
            visibility: visible !important;
          }
          #receipt-content * { visibility: visible !important; }
          .modal-overlay, .modal-content { background: transparent !important; box-shadow: none !important; border: none !important; }
        }
      `}} />
    </Modal>
  );
};

export default FeesPage;
