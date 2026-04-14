import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Plus, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../UI/Modal';
import { Input, Select } from '../UI/Input';
import { Button } from '../UI/Button';

interface GlobalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth: string;
}

const GlobalPaymentModal: React.FC<GlobalPaymentModalProps> = ({
  isOpen, onClose, defaultMonth
}) => {
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    feeType: 'MONTHLY',
    paidAmount: '',
    paymentMethod: 'CASH',
    remarks: '',
    otherReason: ''
  });

  const queryClient = useQueryClient();

  // Fetch ALL students for selection
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['studentsList', searchStudent],
    queryFn: async () => {
      const response = await api.get(`/students?search=${searchStudent}&limit=10`);
      return response.data.data;
    },
    enabled: isOpen && searchStudent.length > 2,
  });

  const students = studentsData || [];

  const recordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;
      
      const finalRemarks = formData.feeType === 'OTHER' 
        ? `Other: ${formData.otherReason}${formData.remarks ? ' | ' + formData.remarks : ''}`
        : formData.remarks;

      const response = await api.post('/fees/payments', {
        studentId: selectedStudent.id,
        feeType: formData.feeType,
        month: formData.feeType === 'MONTHLY' ? defaultMonth : null,
        amount: parseFloat(formData.paidAmount),
        paidAmount: parseFloat(formData.paidAmount),
        paymentMethod: formData.paymentMethod,
        remarks: finalRemarks,
        dueDate: new Date(defaultMonth + '-05').toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment successfully recorded');
      queryClient.invalidateQueries();
      onClose();
      // Reset state
      setSelectedStudent(null);
      setSearchStudent('');
      setFormData({ feeType: 'MONTHLY', paidAmount: '', paymentMethod: 'CASH', remarks: '', otherReason: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
        toast.error('Please select a student first');
        return;
    }
    if (formData.feeType === 'OTHER' && !formData.otherReason) {
      toast.error('Please specify a reason for "Other" payment');
      return;
    }
    recordMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Payment Entry" size="md">
      <div className="space-y-6">
        {/* Student Selection Section */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Search Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Type student name or ID (min 3 chars)..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          
          {selectedStudent ? (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center animate-in fade-in slide-in-from-top-2">
              <div>
                <p className="font-black text-blue-900">{selectedStudent.fullName}</p>
                <p className="text-xs text-blue-600 font-bold uppercase">{selectedStudent.class?.name} | {selectedStudent.admissionNumber}</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border border-gray-50 rounded-xl">
              {studentsLoading && <p className="text-xs text-gray-400 animate-pulse p-2">Searching students...</p>}
              {searchStudent.length > 2 && students.length === 0 && !studentsLoading && (
                <p className="text-xs text-gray-400 p-2 italic">No students found matching "{searchStudent}"</p>
              )}
              {students.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setSearchStudent(s.fullName);
                  }}
                  className="w-full text-left p-2.5 hover:bg-gray-50 rounded-lg text-sm font-medium border border-transparent hover:border-gray-100 transition-all flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-none">{s.fullName}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-black mt-1 tracking-wider">{s.admissionNumber}</p>
                  </div>
                  <Plus size={14} className="ml-auto text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={`space-y-5 pt-4 border-t border-gray-100 ${!selectedStudent ? 'opacity-20 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-2 gap-4">
             <Select
                label="Fee Type"
                value={formData.feeType}
                onChange={(e) => setFormData({...formData, feeType: e.target.value})}
                options={[
                    { value: 'MONTHLY', label: 'Monthly Fee' },
                    { value: 'ADMISSION', label: 'Admission Fee' },
                    { value: 'EXAM', label: 'Examination Fee' },
                    { value: 'OTHER', label: 'Others' }
                ]}
                className="bg-gray-50 border-none rounded-xl font-bold"
              />
             <Input
                label="Amount (LKR)"
                type="number"
                placeholder="2000"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                required
                className="font-black text-blue-600"
              />
          </div>

          {formData.feeType === 'MONTHLY' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
                <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Target Month</label>
                <div className="p-3 bg-blue-50/50 rounded-xl font-bold text-blue-900 border border-blue-100">
                  {defaultMonth}
                </div>
            </div>
          )}

          {formData.feeType === 'OTHER' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
                <Input 
                    label="Reason for Collection"
                    value={formData.otherReason}
                    onChange={(e) => setFormData({...formData, otherReason: e.target.value})}
                    placeholder="e.g., Uniform, Books, etc."
                    className="bg-orange-50/50 border-orange-200 border rounded-xl font-bold text-orange-900 placeholder:text-orange-300"
                    required
                />
            </div>
          )}

          <Select
            label="Payment Method"
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'ONLINE', label: 'Online Gateway' },
            ]}
          />

          <Input
            label="Remarks (Optional)"
            placeholder="Reference number or notes..."
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />

          <div className="pt-4 flex gap-3">
            <Button 
                variant="secondary" 
                onClick={onClose} 
                className="flex-1 font-bold h-12 rounded-xl"
                type="button"
            >
                Cancel
            </Button>
            <Button 
                type="submit"
                disabled={recordMutation.isPending || !selectedStudent}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-200"
            >
              {recordMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default GlobalPaymentModal;
