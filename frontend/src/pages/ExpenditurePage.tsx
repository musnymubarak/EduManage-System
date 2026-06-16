import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Calendar, DollarSign, Trash2 } from 'lucide-react';
import api from '../services/api';
import { Expenditure, BankAccount } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { formatDate, formatCurrency } from '../utils/helpers';
import { ActionMenu } from '../components/UI/ActionMenu';

const CATEGORY_LABELS: Record<string, string> = {
  COOKING: 'Food & Bevarages',
  ADMINISTRATION: 'Administration',
  DEVELOPMENT: 'Development',
  OTHERS: 'Others',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  ONLINE: 'Card/Online',
};

const ExpenditurePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenditures/${id}`),
    onSuccess: () => {
      toast.success('Expenditure deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete expenditure');
    },
  });

  const handleDeleteExpenditure = (expenditure: Expenditure) => {
    if (window.confirm(`Are you sure you want to delete this expenditure? This action cannot be undone.`)) {
      deleteMutation.mutate(expenditure.id);
    }
  };

  // Fetch expenditures
  const { data: expendituresData, isLoading } = useQuery({
    queryKey: ['expenditures', searchQuery, categoryFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/expenditures?${params}`);
      return response.data;
    },
  });

  const expenditures: Expenditure[] = expendituresData?.data || [];

  // Calculate total
  const totalExpenditure = expenditures.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Expenditure Management</h2>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Record Expenditure
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vendor, bill number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="COOKING">Food & Bevarages</option>
              <option value="ADMINISTRATION">Administration</option>
              <option value="DEVELOPMENT">Development</option>
              <option value="OTHERS">Others</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Total Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Expenditure</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenditure)}</p>
          </div>
          <DollarSign className="h-12 w-12 text-red-200" />
        </div>
      </Card>

      {/* Expenditures Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading expenditures...</div>
        ) : expenditures.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No expenditures found. Click "Record Expenditure" to add a new entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vendor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill No.</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Method</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenditures.map((expenditure) => (
                  <tr key={expenditure.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(expenditure.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {CATEGORY_LABELS[expenditure.category] || expenditure.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {expenditure.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{expenditure.vendor || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {expenditure.billNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                      {formatCurrency(expenditure.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {PAYMENT_METHOD_LABELS[expenditure.paymentMethod] || expenditure.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end">
                        <ActionMenu items={[
                          { label: 'Delete', icon: <Trash2 size={15} />, onClick: () => handleDeleteExpenditure(expenditure), variant: 'danger' },
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

      {/* Add Expenditure Modal */}
      <AddExpenditureModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

// Add Expenditure Modal Component
interface AddExpenditureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddExpenditureModal: React.FC<AddExpenditureModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    vendor: '',
    billNumber: '',
    paymentMethod: 'CASH',
    bankAccountId: '',
    referenceNumber: '',
    referenceDate: '',
  });

  const { data: accounts } = useQuery({
    queryKey: ['activeBankAccounts'],
    queryFn: () => api.get('/banking/accounts').then(res => res.data.data.filter((a: BankAccount) => a.isActive)),
  });

  const queryClient = useQueryClient();

  const addExpenditureMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/expenditures', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Expenditure recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
      onClose();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: '',
        vendor: '',
        billNumber: '',
        paymentMethod: 'CASH',
        bankAccountId: '',
        referenceNumber: '',
        referenceDate: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record expenditure');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'CHEQUE') && !formData.bankAccountId) {
      toast.error('Please select a bank account');
      return;
    }
    
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      bankAccountId: formData.bankAccountId || undefined,
      referenceNumber: formData.referenceNumber || undefined,
      referenceDate: formData.referenceDate || undefined,
    };

    addExpenditureMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Expenditure"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addExpenditureMutation.isPending}>
            {addExpenditureMutation.isPending ? 'Recording...' : 'Record Expenditure'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          required
        />

        <Select
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={[
            { value: 'COOKING', label: 'Food & Bevarages' },
            { value: 'ADMINISTRATION', label: 'Administration' },
            { value: 'DEVELOPMENT', label: 'Development' },
            { value: 'OTHERS', label: 'Others' },
          ]}
          required
        />

        <TextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          required
        />

        <Input
          label="Amount (LKR)"
          name="amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          required
        />

        <Input
          label="Vendor/Supplier (Optional)"
          name="vendor"
          value={formData.vendor}
          onChange={handleChange}
        />

        <Input
          label="Bill/Receipt Number (Optional)"
          name="billNumber"
          value={formData.billNumber}
          onChange={handleChange}
        />

        <Select
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'CHEQUE', label: 'Cheque' },
            { value: 'ONLINE', label: 'Card/Online' },
          ]}
          required
        />

        {(formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'CHEQUE') && (
          <Select
            label="Withdraw from Bank Account"
            name="bankAccountId"
            value={formData.bankAccountId}
            onChange={handleChange}
            options={[
              ...(accounts?.map((a: BankAccount) => ({
                value: a.id,
                label: `${a.accountName} (****${a.accountNumber.slice(-4)})`
              })) || [])
            ]}
            required
          />
        )}

        {formData.paymentMethod === 'CHEQUE' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cheque Number"
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleChange}
              required
            />
            <Input
              label="Cheque Date"
              name="referenceDate"
              type="date"
              value={formData.referenceDate}
              onChange={handleChange}
              required
            />
          </div>
        )}
      </form>
    </Modal>
  );
};

export default ExpenditurePage;
