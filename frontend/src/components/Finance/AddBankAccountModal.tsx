import React, { useState, useEffect } from 'react';
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
  editAccount?: BankAccount;
}

export default function AddBankAccountModal({ isOpen, onClose, onSuccess, editAccount }: Props) {
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    branch: '',
    accountType: 'CURRENT',
    openingBalance: '0',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editAccount) {
      setFormData({
        accountName: editAccount.accountName,
        bankName: editAccount.bankName,
        accountNumber: editAccount.accountNumber,
        branch: editAccount.branch || '',
        accountType: editAccount.accountType,
        openingBalance: editAccount.openingBalance.toString(),
        remarks: editAccount.remarks || '',
      });
    }
  }, [editAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editAccount) {
        await api.put(`/banking/accounts/${editAccount.id}`, formData);
        toast.success('Bank account updated successfully');
      } else {
        await api.post('/banking/accounts', formData);
        toast.success('Bank account created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editAccount ? "Edit Bank Account" : "Add Bank Account"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account Name (e.g., School Main Fund)"
          required
          value={formData.accountName}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Bank Name"
            required
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            options={[
              { value: 'Bank of Ceylon (BOC)', label: 'Bank of Ceylon (BOC)' },
              { value: 'People\'s Bank', label: 'People\'s Bank' },
              { value: 'Commercial Bank of Ceylon', label: 'Commercial Bank of Ceylon' },
              { value: 'Hatton National Bank (HNB)', label: 'Hatton National Bank (HNB)' },
              { value: 'Sampath Bank', label: 'Sampath Bank' },
              { value: 'Seylan Bank', label: 'Seylan Bank' },
              { value: 'National Development Bank (NDB)', label: 'National Development Bank (NDB)' },
              { value: 'Nations Trust Bank (NTB)', label: 'Nations Trust Bank (NTB)' },
              { value: 'DFCC Bank', label: 'DFCC Bank' },
              { value: 'Pan Asia Bank', label: 'Pan Asia Bank' },
              { value: 'Union Bank of Colombo', label: 'Union Bank of Colombo' },
              { value: 'Amana Bank', label: 'Amana Bank' },
              { value: 'Standard Chartered Bank', label: 'Standard Chartered Bank' },
              { value: 'HSBC', label: 'HSBC' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <Input
            label="Branch"
            value={formData.branch}
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Account Number"
            required
            disabled={!!editAccount}
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          />
          <Select
            label="Account Type"
            value={formData.accountType}
            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
            options={[
              { value: 'CURRENT', label: 'Current Account' },
              { value: 'SAVINGS', label: 'Savings Account' },
              { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
            ]}
          />
        </div>
        {!editAccount && (
          <Input
            label="Opening Balance"
            type="number"
            min="0"
            step="0.01"
            required
            value={formData.openingBalance}
            onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
          />
        )}
        <Input
          label="Remarks (Optional)"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
        />
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editAccount ? 'Save Changes' : 'Add Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
