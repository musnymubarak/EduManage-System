import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Modal } from '../UI/Modal';
import { Input, Select, TextArea } from '../UI/Input';
import { Button } from '../UI/Button';
import { IncomeCategory } from '../../types';

interface RecordIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { value: IncomeCategory; label: string }[] = [
  { value: 'DONATION', label: 'Donation' },
  { value: 'IFTAR_DONATION', label: 'Iftar Donation' },
  { value: 'FIXED_DEPOSIT_PROFIT', label: 'Fixed Deposit Profit (Bank)' },
  { value: 'LAND_SHARE_RENT', label: 'Land Share & Rent' },
  { value: 'SOLAR_PANEL_PROFIT', label: 'Solar Panel Profit' },
  { value: 'ALMS_BOX', label: 'Alms Box' },
  { value: 'OTHER', label: 'Other Income' },
];

const DONATION_CATEGORIES: IncomeCategory[] = ['DONATION', 'IFTAR_DONATION'];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  category: 'DONATION' as IncomeCategory,
  amount: '',
  paymentMethod: 'CASH',
  source: '',
  description: '',
  remarks: '',
};

const RecordIncomeModal: React.FC<RecordIncomeModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ ...emptyForm });
  const queryClient = useQueryClient();

  const isDonation = DONATION_CATEGORIES.includes(formData.category);
  const isOther = formData.category === 'OTHER';

  const recordMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/income', {
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        source: formData.source,
        description: formData.description,
        remarks: formData.remarks,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Income recorded successfully!');
      queryClient.invalidateQueries();
      setFormData({ ...emptyForm });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record income');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (isOther && !formData.description.trim()) {
      toast.error('Please specify a description for "Other Income"');
      return;
    }
    recordMutation.mutate();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Income"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={recordMutation.isPending}>
            {recordMutation.isPending ? 'Recording...' : 'Record Income'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Income Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={CATEGORY_OPTIONS}
          required
        />

        {isDonation && (
          <Input
            label="Donor / Source Name (Optional)"
            name="source"
            value={formData.source}
            onChange={handleChange}
            placeholder="Name of the donor"
          />
        )}

        {isOther && (
          <Input
            label="Specify Income"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe this income source"
            required
          />
        )}

        <div className="grid grid-cols-2 gap-4">
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
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <Select
          label="Received Via"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Deposit' },
          ]}
          required
        />

        <TextArea
          label="Remarks (Optional)"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          rows={2}
          placeholder="Additional notes"
        />
      </form>
    </Modal>
  );
};

export default RecordIncomeModal;
