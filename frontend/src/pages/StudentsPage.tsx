import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, GraduationCap, TrendingUp, Users, BookOpen, School, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Student, Class } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { SingleImageUpload, FileUpload } from '../components/UI/FileUpload';
import { getFileUrl } from '../utils/helpers';
import { MultiPhoneInput } from '../components/UI/MultiPhoneInput';


const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [sortBy, setSortBy] = useState<'admission_asc' | 'admission_desc' | 'name_asc' | 'name_desc'>('admission_asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', searchQuery, selectedClass, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedClass) params.append('classId', selectedClass);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      
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

  const students: Student[] = studentsData?.data || [];
  const classes: Class[] = classesData?.data || [];

  // Apply sorting
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'admission_asc') return a.admissionNumber.localeCompare(b.admissionNumber, undefined, { numeric: true });
    if (sortBy === 'admission_desc') return b.admissionNumber.localeCompare(a.admissionNumber, undefined, { numeric: true });
    if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
    if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
    return 0;
  });

  const handleViewStudent = (student: Student) => {
    navigate(`/students/${student.id}`);
  };

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Students', value: students.filter((s: any) => s.status === 'ACTIVE').length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Classes', value: classes.length, icon: School, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Enrollments', value: students.length, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-gray-900">Student Management</h2>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-gray-500">
            <GraduationCap size={14} className="text-blue-500" />
            Comprehensive database of enrolled students and academic records
          </p>
        </div>
        <div className="flex flex-row items-center gap-3 shrink-0 flex-nowrap">
          <Button
            onClick={() => {
              setEditingStudent(null);
              setIsModalOpen(true);
            }}
            className="gap-2 whitespace-nowrap"
            size="lg"
          >
            <Plus size={18} className="shrink-0 transition-transform duration-200 group-hover:rotate-90" />
            <span>Register Student</span>
          </Button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="group transition-shadow hover:shadow-md" padding="none">
            <div className="flex items-center gap-4 p-5">
              <div className={`${stat.bg} ${stat.color} flex h-11 w-11 items-center justify-center rounded-lg`}>
                <stat.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, admission number, or NIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="admission_asc">Sort: Admission (A-Z)</option>
              <option value="admission_desc">Sort: Admission (Z-A)</option>
              <option value="name_asc">Sort: Name (A-Z)</option>
              <option value="name_desc">Sort: Name (Z-A)</option>
            </select>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-10 min-w-[150px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse p-10 text-center text-sm text-gray-500">Loading student records…</div>
        ) : sortedStudents.length === 0 ? (
          <div className="p-16 text-center text-sm text-gray-500">No students found matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Identity & Admission</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Class</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Guardian & Contact</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="w-[1%] whitespace-nowrap px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedStudents.map((student: Student) => (
                  <tr key={student.id} className="group transition-colors hover:bg-blue-50/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {student.profilePhoto ? (
                            <img src={getFileUrl(student.profilePhoto)} alt="" className="h-full w-full object-cover" />
                          ) : <Users size={18} className="text-gray-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-blue-700">{student.fullName}</p>
                          <p className="truncate text-xs font-semibold text-blue-600">
                            {student.indexNumber || student.admissionNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-gray-700">{student.class?.name || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{student.guardianName}</p>
                      <p className="text-xs text-gray-500">
                        {student.guardianPhones && student.guardianPhones.length > 0 ? student.guardianPhones[0] : 'N/A'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={student.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="w-[1%] whitespace-nowrap px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          onClick={() => handleViewStudent(student)}
                          variant="secondary"
                          size="icon"
                          aria-label="View"
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingStudent(student);
                            setIsModalOpen(true);
                          }}
                          variant="secondary"
                          size="icon"
                          aria-label="Edit"
                          className="hover:bg-amber-50 hover:text-amber-600"
                        >
                          <Pencil size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Student Modal */}
      <StudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        classes={classes}
        initialData={editingStudent}
      />
    </div>
  );
};

// Student Modal Component
interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  initialData?: Student | null;
}

export const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, classes, initialData }) => {
  const [profilePhoto, setProfilePhoto] = useState<File | string | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setProfilePhoto(initialData?.profilePhoto || null);
    }
  }, [isOpen, initialData]);

  const queryClient = useQueryClient();

  const studentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (initialData) {
        const response = await api.put(`/students/${initialData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } else {
        const response = await api.post('/students', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(initialData ? 'Student updated successfully!' : 'Student registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
      setProfilePhoto(null);
      setDocuments([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to ${initialData ? 'update' : 'register'} student`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (profilePhoto instanceof File) {
      formData.append('profilePhoto', profilePhoto);
    } else if (initialData?.profilePhoto && profilePhoto === null) {
      // Photo was removed
      formData.append('removeProfilePhoto', 'true');
    }

    documents.forEach((doc) => {
      formData.append('documents', doc);
    });

    studentMutation.mutate(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Update Student Record' : 'Register New Student'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Personal Information</h4>
            <Input label="Full Name" name="fullName" required defaultValue={initialData?.fullName} placeholder="e.g. John Doe" />
            <Input label="Name with Initials" name="nameWithInitials" required defaultValue={initialData?.nameWithInitials} placeholder="e.g. J. Doe" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" name="dateOfBirth" type="date" required defaultValue={initialData?.dateOfBirth?.split('T')[0]} />
              <Select
                label="Gender"
                name="gender"
                required
                defaultValue={initialData?.gender}
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Blood Group"
                name="bloodGroup"
                defaultValue={initialData?.bloodGroup}
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
              <Input label="Religion" name="religion" required defaultValue={initialData?.religion} placeholder="e.g. Islam" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ethnicity" name="ethnicity" required defaultValue={initialData?.ethnicity} placeholder="e.g. Sinhalese" />
              <Input label="Nationality" name="nationality" defaultValue={initialData?.nationality || "Sri Lankan"} required />
            </div>
            <Input label="NIC / Identification" name="nic" defaultValue={initialData?.nic} placeholder="Optional for minors" />
            <Input label="Birth Certificate No." name="birthCertificateNo" defaultValue={initialData?.birthCertificateNo} placeholder="BC Number" />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Academic & Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Index Number" name="indexNumber" defaultValue={initialData?.indexNumber} placeholder="e.g. IDX-001" />
              <Select
                label="Assigned Class"
                name="classId"
                required
                defaultValue={initialData?.classId}
                options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              />
            </div>
            <Input label="Admission Date" name="admissionDate" type="date" required defaultValue={initialData?.admissionDate?.split('T')[0] || new Date().toISOString().split('T')[0]} />
            <Input label="Mobile Number" name="mobileNumber" defaultValue={initialData?.mobileNumber} />
            <Input label="Physical Address" name="address" required defaultValue={initialData?.address} placeholder="House No, Street Name..." />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" name="city" required defaultValue={initialData?.city} />
              <Input label="District" name="district" required defaultValue={initialData?.district} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Province" name="province" required defaultValue={initialData?.province} />
              <Input label="Postal Code" name="postalCode" defaultValue={initialData?.postalCode} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="G.N Division & Number" name="gnDivision" defaultValue={initialData?.gnDivision} placeholder="e.g. 123A, Kelaniya" />
              <Input label="D.S Division" name="dsDivision" defaultValue={initialData?.dsDivision} placeholder="e.g. Kelaniya" />
            </div>
            <div className="pt-2">
              <SingleImageUpload
                label="Profile Portrait"
                value={profilePhoto}
                onChange={setProfilePhoto}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Guardian Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Guardian Name" name="guardianName" required defaultValue={initialData?.guardianName} placeholder="Full name of guardian" />
            <Input label="Relationship" name="guardianRelationship" required defaultValue={initialData?.guardianRelationship} placeholder="e.g. Father, Mother" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Guardian NIC" name="guardianNIC" required defaultValue={initialData?.guardianNIC} placeholder="NIC Number" />
            <MultiPhoneInput label="Guardian Phone Numbers" name="guardianPhones" initialValues={initialData?.guardianPhones} required />
          </div>
          <Input label="Guardian Occupation" name="guardianOccupation" defaultValue={initialData?.guardianOccupation} placeholder="e.g. Engineer, Teacher" />
          <Input label="Guardian Address" name="guardianAddress" defaultValue={initialData?.guardianAddress} placeholder="If different from student's address" />
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Emergency Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Emergency Contact Name" name="emergencyContactName" required defaultValue={initialData?.emergencyContactName} />
            <Input label="Emergency Contact Phone" name="emergencyContactPhone" required defaultValue={initialData?.emergencyContactPhone} />
          </div>
          <Input label="Relationship" name="emergencyRelationship" required defaultValue={initialData?.emergencyRelationship} placeholder="e.g. Uncle, Aunt" />
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Verification Documents</h4>
          <FileUpload
            label="Identity / Verification Documents"
            multiple
            value={documents}
            onChange={setDocuments}
          />
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 bg-white pb-1 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Discard</Button>
          <Button
            type="submit"
            disabled={studentMutation.isPending}
          >
            {studentMutation.isPending ? 'Processing…' : (initialData ? 'Update Student' : 'Confirm Registration')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentsPage;
