import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Input, Select } from '../UI/Input';
import { FileUpload } from '../UI/FileUpload';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BankAccount } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordBankTransactionModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    bankAccountId: '',
    type: 'DEPOSIT',
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    referenceDate: '',
    remarks: '',
  });

  const { data: accounts } = useQuery({
    queryKey: ['activeBankAccounts'],
    queryFn: () => api.get('/banking/accounts').then(res => res.data.data.filter((a: BankAccount) => a.isActive)),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankAccountId) return toast.error('Please select a bank account');
    
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });
      if (proofFile) {
        data.append('proof', proofFile);
      }

      await api.post('/banking/transactions', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Transaction recorded successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Bank Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Bank Account"
          required
          value={formData.bankAccountId}
          onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
          options={
            accounts?.map((a: BankAccount) => ({
              value: a.id,
              label: `${a.accountName} (****${a.accountNumber.slice(-4)})`
            })) || []
          }
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Transaction Type"
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'DEPOSIT', label: 'Deposit' },
              { value: 'WITHDRAWAL', label: 'Withdrawal' },
            ]}
          />
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <Input
          label="Description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Transaction Date"
            type="date"
            required
            value={formData.transactionDate}
            onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
          />
          <Select
            label="Payment Method"
            required
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'ONLINE', label: 'Online' },
            ]}
          />
        </div>

        {formData.paymentMethod === 'CHEQUE' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cheque Number"
              required
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            />
            <Input
              label="Cheque Date"
              type="date"
              required
              value={formData.referenceDate}
              onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
            />
          </div>
        )}

        {(formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'ONLINE') && (
          <Input
            label="Reference Number"
            value={formData.referenceNumber}
            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document/Photo Proof</label>
          <FileUpload
            onChange={(files: File[]) => setProofFile(files.length > 0 ? files[0] : null)}
            accept=".jpg,.jpeg,.png,.pdf"
            maxSize={5}
          />
        </div>
        
        <Input
          label="Remarks (Optional)"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
        />

        <div className="flex justify-end space-x-3 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Recording...' : 'Record Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
