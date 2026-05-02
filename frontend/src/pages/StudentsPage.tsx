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
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between py-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Student Management</h2>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2 truncate">
            <GraduationCap size={16} className="text-blue-500" />
            Comprehensive database of enrolled students and academic records
          </p>
        </div>
        <div className="flex flex-row items-center gap-3 shrink-0 flex-nowrap">
          <Button
            onClick={() => {
              setEditingStudent(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="font-black uppercase tracking-widest text-[11px]">Register New Student</span>
          </Button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
            <div className="p-5 flex items-center gap-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card className="p-4 border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, admission number, or NIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
            <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest whitespace-nowrap">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px] text-xs font-black uppercase tracking-wider text-gray-600 cursor-pointer"
                >
                  <option value="admission_asc">Admission (A-Z)</option>
                  <option value="admission_desc">Admission (Z-A)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px] text-sm font-bold text-gray-600"
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
              className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px] text-sm font-bold text-gray-600"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
        {isLoading ? (
          <div className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing Student Records...</div>
        ) : sortedStudents.length === 0 ? (
          <div className="p-20 text-center text-gray-400 italic">No students found matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity & Admission</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Academic Details</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Guardian & Contact</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center w-[1%] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedStudents.map((student: Student) => (
                  <tr key={student.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-blue-200 transition-colors">
                          {student.profilePhoto ? (
                            <img src={getFileUrl(student.profilePhoto)} alt="" className="h-full w-full object-cover" />
                          ) : <Users size={20} className="text-gray-400" />}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{student.fullName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{student.admissionNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{student.class?.name}</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Class Enrollment</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="font-black text-gray-900 text-xs">{student.guardianName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {student.guardianPhones && student.guardianPhones.length > 0 ? student.guardianPhones[0] : 'N/A'}
                      </p>
                    </td>
                    <td className="p-5">
                      <Badge variant={student.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[9px] font-black tracking-widest uppercase px-3 py-1">
                        {student.status}
                      </Badge>
                    </td>
                    <td className="p-5 text-center w-[1%] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => handleViewStudent(student)}
                          variant="secondary"
                          className="h-9 w-9 p-0 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm border border-gray-100"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingStudent(student);
                            setIsModalOpen(true);
                          }}
                          variant="secondary"
                          className="h-9 w-9 p-0 rounded-xl bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-all shadow-sm border border-gray-100"
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

const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, classes, initialData }) => {
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
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Personal Information</h4>
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
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Academic & Contact</h4>
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
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Guardian Information</h4>
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
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Emergency Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Emergency Contact Name" name="emergencyContactName" required defaultValue={initialData?.emergencyContactName} />
            <Input label="Emergency Contact Phone" name="emergencyContactPhone" required defaultValue={initialData?.emergencyContactPhone} />
          </div>
          <Input label="Relationship" name="emergencyRelationship" required defaultValue={initialData?.emergencyRelationship} placeholder="e.g. Uncle, Aunt" />
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Verification Documents</h4>
          <FileUpload
            label="Identity / Verification Documents"
            multiple
            value={documents}
            onChange={setDocuments}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
          <Button variant="secondary" type="button" onClick={onClose} className="font-bold border-none h-11 px-8">Discard</Button>
          <Button 
            type="submit" 
            disabled={studentMutation.isPending} 
            className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 px-10 h-11 rounded-xl font-black uppercase tracking-widest text-[11px]"
          >
            {studentMutation.isPending ? 'Processing...' : (initialData ? 'Update Student' : 'Confirm Registration')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentsPage;
