import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Student, Class } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { SingleImageUpload, FileUpload } from '../components/UI/FileUpload';
import { formatDate } from '../utils/helpers';

const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', searchQuery, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedClass) params.append('classId', selectedClass);
      
      const response = await api.get(`/students?${params}`);
      return response.data;
    },
  });

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });

  const students = studentsData?.data || [];
  const classes: Class[] = classesData?.data || [];

  const handleViewStudent = (student: Student) => {
    navigate(`/students/${student.id}`);
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
                placeholder="Search by name, admission number, or NIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} className="mr-2" />
              Add Student
            </Button>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No students found. Click "Add Student" to register a new student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Admission No.
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Guardian
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
                {students.map((student: Student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.admissionNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.class.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.guardianName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.guardianPhone}</td>
                    <td className="px-4 py-3">
                      <Badge status={student.status}>{student.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewStudent(student)}
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

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        classes={classes}
      />
    </div>
  );
};

// Add Student Modal Component
interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, classes }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    nameWithInitials: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    religion: '',
    ethnicity: '',
    nationality: 'Sri Lankan',
    nic: '',
    birthCertificateNo: '',
    address: '',
    city: '',
    district: '',
    province: '',
    postalCode: '',
    mobileNumber: '',
    classId: '',
    guardianName: '',
    guardianRelationship: '',
    guardianNIC: '',
    guardianPhone: '',
    guardianAddress: '',
    guardianOccupation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyRelationship: '',
  });

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);

  const queryClient = useQueryClient();

  const addStudentMutation = useMutation({
    mutationFn: async (data: any) => {
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(data).forEach((key) => {
        if (data[key]) {
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

      const response = await api.post('/students', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Student registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
      setFormData({} as any);
      setProfilePhoto(null);
      setDocuments([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to register student');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStudentMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Student"
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addStudentMutation.isPending}>
            {addStudentMutation.isPending ? 'Registering...' : 'Register Student'}
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
            <Select
              label="Blood Group"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              options={[
                { value: 'A_POSITIVE', label: 'A+' },
                { value: 'A_NEGATIVE', label: 'A-' },
                { value: 'B_POSITIVE', label: 'B+' },
                { value: 'B_NEGATIVE', label: 'B-' },
                { value: 'O_POSITIVE', label: 'O+' },
                { value: 'O_NEGATIVE', label: 'O-' },
                { value: 'AB_POSITIVE', label: 'AB+' },
                { value: 'AB_NEGATIVE', label: 'AB-' },
              ]}
            />
            <Input
              label="Religion"
              name="religion"
              value={formData.religion}
              onChange={handleChange}
              required
            />
            <Input
              label="Ethnicity"
              name="ethnicity"
              value={formData.ethnicity}
              onChange={handleChange}
              required
            />
            <Input
              label="NIC"
              name="nic"
              value={formData.nic}
              onChange={handleChange}
            />
            <Input
              label="Birth Certificate No."
              name="birthCertificateNo"
              value={formData.birthCertificateNo}
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
            <Input
              label="Mobile Number"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
            />
            <Select
              label="Class"
              name="classId"
              value={formData.classId}
              onChange={handleChange}
              options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              required
            />
          </div>
        </div>

        {/* Guardian Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Guardian Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Guardian Name"
              name="guardianName"
              value={formData.guardianName}
              onChange={handleChange}
              required
            />
            <Input
              label="Relationship"
              name="guardianRelationship"
              value={formData.guardianRelationship}
              onChange={handleChange}
              required
            />
            <Input
              label="Guardian NIC"
              name="guardianNIC"
              value={formData.guardianNIC}
              onChange={handleChange}
              required
            />
            <Input
              label="Guardian Phone"
              name="guardianPhone"
              value={formData.guardianPhone}
              onChange={handleChange}
              required
            />
            <Input
              label="Guardian Occupation"
              name="guardianOccupation"
              value={formData.guardianOccupation}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Emergency Contact</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Emergency Contact Name"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              required
            />
            <Input
              label="Emergency Contact Phone"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              required
            />
            <Input
              label="Relationship"
              name="emergencyRelationship"
              value={formData.emergencyRelationship}
              onChange={handleChange}
              required
            />
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
                Documents (Birth Certificate, NIC, Medical Records, etc.)
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

export default StudentsPage;
