import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Input, Select } from '../UI/Input';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BankAccount } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BankTransferModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: 'Internal Transfer',
    transactionDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    remarks: '',
  });

  const { data: accounts } = useQuery({
    queryKey: ['activeBankAccounts'],
    queryFn: () => api.get('/banking/accounts').then(res => res.data.data.filter((a: BankAccount) => a.isActive)),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromAccountId || !formData.toAccountId) {
      return toast.error('Please select both source and destination accounts');
    }
    if (formData.fromAccountId === formData.toAccountId) {
      return toast.error('Source and destination accounts must be different');
    }
    
    setLoading(true);
    try {
      await api.post('/banking/transfer', formData);
      toast.success('Transfer completed successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bank Transfer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="From Account"
            required
            value={formData.fromAccountId}
            onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
            options={
              accounts?.map((a: BankAccount) => ({
                value: a.id,
                label: `${a.accountName} (${a.currentBalance} LKR)`
              })) || []
            }
          />
          <Select
            label="To Account"
            required
            value={formData.toAccountId}
            onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
            options={
              accounts?.filter((a: BankAccount) => a.id !== formData.fromAccountId).map((a: BankAccount) => ({
                value: a.id,
                label: `${a.accountName}`
              })) || []
            }
          />
        </div>

        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        />

        <Input
          label="Description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Transaction Date"
            type="date"
            required
            value={formData.transactionDate}
            onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
          />
          <Input
            label="Reference Number (Optional)"
            value={formData.referenceNumber}
            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
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
            {loading ? 'Transferring...' : 'Transfer Funds'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
