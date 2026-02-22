import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Search, Plus, Eye, AlertCircle } from 'lucide-react';
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

  const queryClient = useQueryClient();

  // Fetch pending fees
  const { data: pendingFeesData, isLoading } = useQuery({
    queryKey: ['pendingFees', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('status', 'PENDING');
      
      const response = await api.get(`/fees/payments?${params}`);
      return response.data;
    },
  });

  const pendingFees = pendingFeesData?.data || [];

  const handleRecordPayment = (student: Student) => {
    setSelectedStudent(student);
    setIsPaymentModalOpen(true);
  };

  const handleViewHistory = (student: Student) => {
    setSelectedStudent(student);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Fee Management</h2>
          <Button onClick={() => setIsPaymentModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Record Payment
          </Button>
        </div>
      </Card>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Pending Fees Table */}
      <Card title="Pending Fee Payments">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading fees...</div>
        ) : pendingFees.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No pending fees found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Admission No.
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fee Type</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Paid</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingFees.map((fee: any) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {fee.student.fullName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fee.student.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fee.feeType}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(fee.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      {formatCurrency(fee.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                      {formatCurrency(fee.amount - fee.paidAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          fee.status === 'PAID'
                            ? 'success'
                            : fee.status === 'PARTIALLY_PAID'
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
                          onClick={() => handleRecordPayment(fee.student)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="Record Payment"
                        >
                          <DollarSign size={18} className="text-green-600" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(fee.student)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="View History"
                        >
                          <Eye size={18} className="text-blue-600" />
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
            { value: 'MONTHLY_FEE', label: 'Monthly Fee' },
            { value: 'ADMISSION_FEE', label: 'Admission Fee' },
            { value: 'EXAM_FEE', label: 'Exam Fee' },
            { value: 'LIBRARY_FEE', label: 'Library Fee' },
            { value: 'SPORT_FEE', label: 'Sport Fee' },
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
            { value: 'CARD', label: 'Card' },
            { value: 'ONLINE', label: 'Online Payment' },
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
                      : payment.status === 'PARTIALLY_PAID'
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

export default FeesPage;
