import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Teacher } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { SingleImageUpload, FileUpload } from '../components/UI/FileUpload';


const TeachersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch teachers
  const { data: teachersData, isLoading } = useQuery({
    queryKey: ['teachers', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await api.get(`/teachers?${params}`);
      return response.data;
    },
  });

  const teachers = teachersData?.data || [];

  const handleViewTeacher = (id: string) => {
    navigate(`/teachers/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, employee ID, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} className="mr-2" />
              Add Teacher
            </Button>
          </div>
        </div>
      </Card>

      {/* Teachers Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading teachers...</div>
        ) : teachers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No teachers found. Click "Add Teacher" to register a new teacher.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Employee ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teachers.map((teacher: Teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {teacher.employeeNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{teacher.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.designation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.employmentType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.mobileNumber}</td>
                    <td className="px-4 py-3">
                      <Badge status={teacher.status}>{teacher.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewTeacher(teacher.id)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="View Details"
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

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

// Add Teacher Modal Component
interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    nameWithInitials: '',
    dateOfBirth: '',
    gender: '',
    nic: '',
    mobileNumber: '',
    email: '',
    address: '',
    city: '',
    district: '',
    province: '',
    postalCode: '',
    designation: '',
    employmentType: '',
    joinedDate: '',
    basicSalary: '',
  });

  const [qualifications, setQualifications] = useState<any[]>([
    { degree: '', institution: '', year: '', fieldOfStudy: '' },
  ]);

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);

  const queryClient = useQueryClient();

  const addTeacherMutation = useMutation({
    mutationFn: async (data: any) => {
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(data).forEach((key) => {
        if (key === 'qualifications') {
          formDataToSend.append(key, JSON.stringify(data[key]));
        } else if (data[key]) {
          formDataToSend.append(key, data[key]);
        }
      });

      // Append profile photo
      if (profilePhoto) {
        formDataToSend.append('profilePhoto', profilePhoto);
      }

      // Append documents
      documents.forEach((doc) => {
        formDataToSend.append('documents', doc);
      });

      const response = await api.post('/teachers', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Teacher registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      onClose();
      setFormData({} as any);
      setQualifications([{ degree: '', institution: '', year: '', fieldOfStudy: '' }]);
      setProfilePhoto(null);
      setDocuments([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to register teacher');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      basicSalary: parseFloat(formData.basicSalary),
      qualifications: qualifications.filter(q => q.degree && q.institution),
    };
    addTeacherMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addQualification = () => {
    setQualifications([...qualifications, { degree: '', institution: '', year: '', fieldOfStudy: '' }]);
  };

  const updateQualification = (index: number, field: string, value: string) => {
    const updated = [...qualifications];
    updated[index][field] = value;
    setQualifications(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Teacher"
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addTeacherMutation.isPending}>
            {addTeacherMutation.isPending ? 'Registering...' : 'Register Teacher'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Personal Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Name with Initials"
              name="nameWithInitials"
              value={formData.nameWithInitials}
              onChange={handleChange}
              required
            />
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
            />
            <Select
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
              ]}
              required
            />
            <Input
              label="NIC"
              name="nic"
              value={formData.nic}
              onChange={handleChange}
              required
            />
            <Input
              label="Mobile Number"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
            <Input
              label="District"
              name="district"
              value={formData.district}
              onChange={handleChange}
              required
            />
            <Input
              label="Province"
              name="province"
              value={formData.province}
              onChange={handleChange}
              required
            />
            <Input
              label="Postal Code"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Employment Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Employment Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g. Senior Teacher, Assistant Teacher"
              required
            />
            <Select
              label="Employment Type"
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              options={[
                { value: 'FULL_TIME', label: 'Full Time' },
                { value: 'PART_TIME', label: 'Part Time' },
                { value: 'CONTRACT', label: 'Contract' },
              ]}
              required
            />
            <Input
              label="Joined Date"
              name="joinedDate"
              type="date"
              value={formData.joinedDate}
              onChange={handleChange}
              required
            />
            <Input
              label="Basic Salary (LKR)"
              name="basicSalary"
              type="number"
              value={formData.basicSalary}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Qualifications */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Qualifications</h3>
            <Button type="button" variant="secondary" onClick={addQualification}>
              <Award size={16} className="mr-2" />
              Add Qualification
            </Button>
          </div>
          <div className="space-y-4">
            {qualifications.map((qual, index) => (
              <div key={index} className="rounded-lg border p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Degree/Qualification"
                    value={qual.degree}
                    onChange={(e) => updateQualification(index, 'degree', e.target.value)}
                    placeholder="e.g. Bachelor of Arts"
                  />
                  <Input
                    label="Institution"
                    value={qual.institution}
                    onChange={(e) => updateQualification(index, 'institution', e.target.value)}
                    placeholder="e.g. University of Colombo"
                  />
                  <Input
                    label="Year"
                    type="number"
                    value={qual.year}
                    onChange={(e) => updateQualification(index, 'year', e.target.value)}
                    placeholder="e.g. 2020"
                  />
                  <Input
                    label="Field of Study"
                    value={qual.fieldOfStudy}
                    onChange={(e) => updateQualification(index, 'fieldOfStudy', e.target.value)}
                    placeholder="e.g. Islamic Studies"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documents and Photo */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Documents & Photo</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Profile Photo
              </label>
              <SingleImageUpload
                value={profilePhoto}
                onChange={setProfilePhoto}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Documents (NIC, Certificates, Degree Copies, etc.)
              </label>
              <FileUpload
                value={documents}
                onChange={setDocuments}
                multiple
                accept="image/*,application/pdf"
                maxSize={5 * 1024 * 1024}
                preview
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TeachersPage;
