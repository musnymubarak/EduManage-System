import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Heart, Calendar } from 'lucide-react';
import api from '../services/api';
import { Donation } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';

const DonationsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [donationTypeFilter, setDonationTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch donations
  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['donations', searchQuery, donationTypeFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (donationTypeFilter) params.append('type', donationTypeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/donations?${params}`);
      return response.data;
    },
  });

  const donations: Donation[] = donationsData?.data || [];

  // Calculate total
  const totalDonations = donations.reduce((sum, don) => sum + don.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Donation Management</h2>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Record Donation
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
                  placeholder="Search by donor name or receipt number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={donationTypeFilter}
              onChange={(e) => setDonationTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="GENERAL">General</option>
              <option value="ZAKAT">Zakat</option>
              <option value="SADAQAH">Sadaqah</option>
              <option value="BUILDING_FUND">Building Fund</option>
              <option value="SCHOLARSHIP">Scholarship</option>
              <option value="OTHER">Other</option>
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
            <p className="text-sm text-gray-600">Total Donations Received</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalDonations)}</p>
          </div>
          <Heart className="h-12 w-12 text-green-200" />
        </div>
      </Card>

      {/* Donations Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading donations...</div>
        ) : donations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No donations found. Click "Record Donation" to add a new entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Donor Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Receipt No.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(donation.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {donation.donorName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">{donation.donationType}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                      {formatCurrency(donation.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {donation.receiptNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Donation Modal */}
      <AddDonationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

// Add Donation Modal Component
interface AddDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddDonationModal: React.FC<AddDonationModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    donorName: '',
    amount: '',
    donationType: '',
    contactNumber: '',
    address: '',
    remarks: '',
    receiptNumber: '',
  });

  const queryClient = useQueryClient();

  const addDonationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/donations', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Donation recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      onClose();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        donorName: '',
        amount: '',
        donationType: '',
        contactNumber: '',
        address: '',
        remarks: '',
        receiptNumber: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record donation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
    };

    addDonationMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Donation"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addDonationMutation.isPending}>
            {addDonationMutation.isPending ? 'Recording...' : 'Record Donation'}
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

        <Input
          label="Donor Name"
          name="donorName"
          value={formData.donorName}
          onChange={handleChange}
          placeholder="Full name of the donor"
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

        <Select
          label="Donation Type"
          name="donationType"
          value={formData.donationType}
          onChange={handleChange}
          options={[
            { value: 'GENERAL', label: 'General Donation' },
            { value: 'ZAKAT', label: 'Zakat' },
            { value: 'SADAQAH', label: 'Sadaqah' },
            { value: 'BUILDING_FUND', label: 'Building Fund' },
            { value: 'SCHOLARSHIP', label: 'Scholarship Fund' },
            { value: 'OTHER', label: 'Other' },
          ]}
          required
        />

        <Input
          label="Contact Number (Optional)"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          placeholder="Donor's contact number"
        />

        <TextArea
          label="Address (Optional)"
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={2}
          placeholder="Donor's address"
        />

        <Input
          label="Receipt Number (Optional)"
          name="receiptNumber"
          value={formData.receiptNumber}
          onChange={handleChange}
          placeholder="Auto-generated if left empty"
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

export default DonationsPage;
