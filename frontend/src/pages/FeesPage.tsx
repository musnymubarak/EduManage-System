import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Search, Plus, AlertCircle, FileText, Printer } from 'lucide-react';
import api from '../services/api';
import { Student, FeePayment } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';

const FeesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE'>('ALL');
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Fetch fees
  const { data: feesData, isLoading } = useQuery({
    queryKey: ['fees', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      
      const response = await api.get(`/fees/payments?${params}`);
      return response.data;
    },
  });

  const fees = feesData?.data || [];

  // Summary calculations
  const totalAmount = fees.reduce((sum: number, f: any) => sum + f.amount, 0);
  const totalPaid = fees.reduce((sum: number, f: any) => sum + f.paidAmount, 0);
  const totalBalance = fees.reduce((sum: number, f: any) => sum + f.balance, 0);

  const handleRecordPayment = (student: Student) => {
    setSelectedStudent(student);
    setIsPaymentModalOpen(true);
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Fee Ledger</h2>
          <Button onClick={() => setIsPaymentModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Record Payment
          </Button>
        </div>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-blue-50 border-blue-100 p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">Total Expected</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-100 p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">Total Collected</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-red-50 border-red-100 p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {(['ALL', 'PENDING', 'PARTIAL', 'PAID'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                  statusFilter === status
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Fee Ledger Table */}
      <Card title={`${statusFilter === 'ALL' ? 'All' : statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Fee Payments`}>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading fees...</div>
        ) : fees.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No fees found for this filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Receipt / Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admission No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fee Type</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Paid</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fees.map((fee: any) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{fee.receiptNumber || 'Pending'}</div>
                      <div className="text-xs text-gray-500">{fee.paymentDate ? formatDate(fee.paymentDate) : 'Not paid'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {fee.student.fullName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fee.student.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="font-medium">{fee.feeType}</div>
                      <div className="text-xs text-gray-500">{fee.paymentMethod || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(fee.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                      {formatCurrency(fee.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                      {formatCurrency(fee.balance)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          fee.status === 'PAID'
                            ? 'success'
                            : fee.status === 'PARTIAL'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {fee.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedFee(fee);
                            setIsReceiptModalOpen(true);
                          }}
                          className="rounded p-1.5 hover:bg-blue-50 text-blue-600 transition-colors"
                          title="View Receipt"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => handleRecordPayment(fee.student)}
                          className="rounded p-1.5 hover:bg-green-50 text-green-600 transition-colors"
                          title="Record Payment"
                        >
                          <DollarSign size={18} />
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

      {/* Fee Receipt Modal */}
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

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedStudent(null);
        }}
        preSelectedStudent={selectedStudent}
      />

      {/* Payment History Modal */}
      {selectedStudent && (
        <PaymentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
        />
      )}
    </div>
  );
};

// Record Payment Modal Component
interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedStudent?: Student | null;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  preSelectedStudent,
}) => {
  const [formData, setFormData] = useState({
    studentId: preSelectedStudent?.id || '',
    feeType: '',
    amount: '',
    paidAmount: '',
    paymentMethod: '',
    remarks: '',
  });

  const queryClient = useQueryClient();

  // Fetch students for dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await api.get('/students');
      return response.data;
    },
  });

  const students: Student[] = studentsData?.data || [];

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/fees/payments', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['pendingFees'] });
      onClose();
      setFormData({
        studentId: '',
        feeType: '',
        amount: '',
        paidAmount: '',
        paymentMethod: '',
        remarks: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      paidAmount: parseFloat(formData.paidAmount),
      dueDate: new Date().toISOString(), // Default to today
      academicYear: "2024-2025", // Fallback, backend should handle better too
    };

    recordPaymentMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const balance = parseFloat(formData.amount || '0') - parseFloat(formData.paidAmount || '0');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Fee Payment"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={recordPaymentMutation.isPending}>
            {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!preSelectedStudent && (
          <Select
            label="Student"
            name="studentId"
            value={formData.studentId}
            onChange={handleChange}
            options={students.map((s) => ({
              value: s.id,
              label: `${s.fullName} (${s.admissionNumber})`,
            }))}
            required
          />
        )}

        <Select
          label="Fee Type"
          name="feeType"
          value={formData.feeType}
          onChange={handleChange}
          options={[
            { value: 'MONTHLY', label: 'Monthly Fee' },
            { value: 'ADMISSION', label: 'Admission Fee' },
            { value: 'EXAM', label: 'Exam Fee' },
            { value: 'OTHER', label: 'Other' },
          ]}
          required
        />

        <Input
          label="Total Amount (LKR)"
          name="amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          required
        />

        <Input
          label="Paid Amount (LKR)"
          name="paidAmount"
          type="number"
          step="0.01"
          value={formData.paidAmount}
          onChange={handleChange}
          required
        />

        {balance > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3">
            <AlertCircle size={20} className="text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Partial Payment</p>
              <p className="text-sm text-yellow-700">Balance: {formatCurrency(balance)}</p>
            </div>
          </div>
        )}

        <Select
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'ONLINE', label: 'Online Payment' },
            { value: 'CHEQUE', label: 'Cheque' },
          ]}
          required
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Remarks (Optional)
          </label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>
    </Modal>
  );
};

// Payment History Modal Component
interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ isOpen, onClose, student }) => {
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['paymentHistory', student.id],
    queryFn: async () => {
      const response = await api.get(`/fees/payments?studentId=${student.id}`);
      return response.data;
    },
    enabled: isOpen,
  });

  const payments: FeePayment[] = paymentsData?.data || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payment History - ${student.fullName}`} size="lg">
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading payment history...</div>
      ) : payments.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No payment history found</div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{payment.feeType}</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    {payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'}
                  </p>
                </div>
                <Badge
                  variant={
                    payment.status === 'PAID'
                      ? 'success'
                      : payment.status === 'PARTIAL'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {payment.status}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid Amount</p>
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(payment.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-sm font-medium text-red-600">
                    {formatCurrency(payment.amount - payment.paidAmount)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Method:</span> {payment.paymentMethod}
              </p>
              {payment.remarks && (
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Remarks:</span> {payment.remarks}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// Fee Receipt Modal Component
interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: any;
}

const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({ isOpen, onClose, fee }) => {
  const handlePrint = () => {
    window.print();
  };

  if (!fee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fee.status === 'PENDING' ? 'Fee Invoice' : 'Fee Receipt'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 no-print">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={18} className="mr-2" />
            Print
          </Button>
        </div>
      }
    >
      <div className="receipt-container p-6 bg-white" id="receipt-content">
        {/* Branding Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 leading-none">BUHARY MADRASA</h1>
            <p className="text-sm text-gray-500 mt-2 font-medium uppercase tracking-wider">Official {fee.status === 'PENDING' ? 'Invoice' : 'Payment Receipt'}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900">No: {fee.receiptNumber || `INV-${fee.id.slice(0, 8).toUpperCase()}`}</div>
            <div className="text-sm text-gray-600 mt-1">{formatDate(fee.paymentDate || new Date().toISOString())}</div>
          </div>
        </div>

        {/* Student Box */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Student Information</h3>
            <div className="space-y-1">
              <p className="font-bold text-gray-900 text-lg">{fee.student.fullName}</p>
              <p className="text-sm text-gray-600">Admission No: {fee.student.admissionNumber}</p>
              <p className="text-sm text-gray-600">Class: {fee.student.class?.name || 'N/A'}</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Academic Info</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600"><span className="font-medium">Academic Year:</span> {fee.academicYear}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Fee Type:</span> {fee.feeType}</p>
              {fee.month && <p className="text-sm text-gray-600"><span className="font-medium">Month:</span> {fee.month}</p>}
            </div>
          </div>
        </div>

        {/* Financial Table */}
        <div className="border rounded-xl overflow-hidden mb-8">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{fee.feeType} Tuition / Fees</p>
                  <p className="text-xs text-gray-500 mt-1">Payment Method: {fee.paymentMethod || 'N/A'}</p>
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(fee.amount)}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-600 text-right">Paid Amount</td>
                <td className="px-6 py-3 text-sm font-bold text-green-600 text-right">{formatCurrency(fee.paidAmount)}</td>
              </tr>
              <tr className="border-t-2 border-double border-gray-200">
                <td className="px-6 py-4 text-base font-bold text-gray-900 text-right uppercase tracking-wider">Remaining Balance</td>
                <td className="px-6 py-4 text-lg font-black text-red-600 text-right">{formatCurrency(fee.balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end mt-12 pt-8 border-t border-gray-100">
          <div>
            {fee.remarks && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Remarks</h4>
                <p className="text-sm text-gray-600 max-w-sm italic">"{fee.remarks}"</p>
              </div>
            )}
            <p className="text-[10px] text-gray-400">Generated on {new Date().toLocaleString()} by EduManage System</p>
          </div>
          <div className="text-center w-48">
            <div className="border-b-2 border-gray-300 mb-2 h-12"></div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Authorized Signature</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}} />
    </Modal>
  );
};

export default FeesPage;
