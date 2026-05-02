import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, GraduationCap, Users, BookOpen, Pencil, UserCheck } from 'lucide-react';
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
import { getFileUrl } from '../utils/helpers';
import { MultiPhoneInput } from '../components/UI/MultiPhoneInput';


const TeachersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'id_asc' | 'id_desc' | 'name_asc' | 'name_desc'>('id_asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
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

  const teachers: Teacher[] = teachersData?.data || [];

  // Apply sorting
  const sortedTeachers = [...teachers].sort((a, b) => {
    if (sortBy === 'id_asc') return a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true });
    if (sortBy === 'id_desc') return b.employeeNumber.localeCompare(a.employeeNumber, undefined, { numeric: true });
    if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
    if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
    return 0;
  });

  const handleViewTeacher = (id: string) => {
    navigate(`/teachers/${id}`);
  };

  const stats = [
    { label: 'Total Teachers', value: teachers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Faculty', value: teachers.filter((t: any) => t.status === 'ACTIVE').length, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Qualifications', value: teachers.reduce((acc: number, t: any) => acc + (t.qualifications?.length || 0), 0), icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Academic Staff', value: teachers.length, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between py-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Teacher Management</h2>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2 truncate">
            <UserCheck size={16} className="text-blue-500" />
            Administration of academic faculty and educational personnel
          </p>
        </div>
        <div className="flex flex-row items-center gap-3 shrink-0 flex-nowrap">
          <Button
            onClick={() => {
              setEditingTeacher(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="font-black uppercase tracking-widest text-[11px]">Register New Teacher</span>
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
              placeholder="Search by name, employee ID, or contact..."
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
                  <option value="id_asc">Teacher ID (A-Z)</option>
                  <option value="id_desc">Teacher ID (Z-A)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px] text-sm font-bold text-gray-600"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Teachers Table */}
      <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
        {isLoading ? (
          <div className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing Faculty Data...</div>
        ) : sortedTeachers.length === 0 ? (
          <div className="p-20 text-center text-gray-400 italic">No teachers found matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Designation & Type</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Contact Info</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center w-[1%] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedTeachers.map((teacher: Teacher) => (
                  <tr key={teacher.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-blue-200 transition-colors">
                          {teacher.profilePhoto ? (
                            <img src={getFileUrl(teacher.profilePhoto)} alt="" className="h-full w-full object-cover" />
                          ) : <Users size={20} className="text-gray-400" />}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{teacher.fullName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{teacher.employeeNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{teacher.designation}</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{teacher.employmentType}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="font-black text-gray-900 text-xs">{teacher.phoneNumbers?.[0] || 'N/A'}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{teacher.email}</p>
                    </td>
                    <td className="p-5">
                      <Badge variant={teacher.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[9px] font-black tracking-widest uppercase px-3 py-1">
                        {teacher.status}
                      </Badge>
                    </td>
                    <td className="p-5 text-center w-[1%] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => handleViewTeacher(teacher.id)}
                          variant="secondary"
                          className="h-9 w-9 p-0 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm border border-gray-100"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingTeacher(teacher);
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

      {/* Teacher Modal */}
      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingTeacher}
      />
    </div>
  );
};

// Teacher Modal Component
interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any | null;
}

const TeacherModal: React.FC<TeacherModalProps> = ({ isOpen, onClose, initialData }) => {
  const [profilePhoto, setProfilePhoto] = useState<File | string | null>(null);
  const [qualifications, setQualifications] = useState<any[]>(
    initialData?.qualifications?.map((q: any) => ({
      degree: q.qualification,
      institution: q.institution,
      year: q.year,
      fieldOfStudy: q.field
    })) || [{ degree: '', institution: '', year: '', fieldOfStudy: '' }]
  );

  React.useEffect(() => {
    if (isOpen) {
      setProfilePhoto(initialData?.profilePhoto || null);
    }
  }, [isOpen, initialData]);

  const [documents, setDocuments] = useState<File[]>([]);
  const queryClient = useQueryClient();

  const teacherMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (initialData) {
        const response = await api.put(`/teachers/${initialData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } else {
        const response = await api.post('/teachers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(initialData ? 'Teacher updated successfully!' : 'Teacher registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      onClose();
      setQualifications([{ degree: '', institution: '', year: '', fieldOfStudy: '' }]);
      setProfilePhoto(null);
      setDocuments([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to ${initialData ? 'update' : 'register'} teacher`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Add qualifications as JSON string
    const validQualifications = qualifications.filter(q => q.degree && q.institution);
    formData.append('qualifications', JSON.stringify(validQualifications));

    if (profilePhoto instanceof File) {
      formData.append('profilePhoto', profilePhoto);
    } else if (initialData?.profilePhoto && profilePhoto === null) {
      // Photo was removed
      formData.append('removeProfilePhoto', 'true');
    }

    documents.forEach((doc) => {
      formData.append('documents', doc);
    });

    teacherMutation.mutate(formData);
  };

  const addQualification = () => {
    setQualifications([...qualifications, { degree: '', institution: '', year: '', fieldOfStudy: '' }]);
  };

  const updateQualification = (index: number, field: string, value: string) => {
    const updated = [...qualifications];
    updated[index][field] = value;
    setQualifications(updated);
  };

  const removeQualification = (index: number) => {
    if (qualifications.length > 1) {
      setQualifications(qualifications.filter((_, i) => i !== index));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Update Teacher Record' : 'Register New Teacher'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Personal Details</h4>
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
            <Input label="NIC / Identification" name="nic" required defaultValue={initialData?.nic} placeholder="Identification Number" />
            <div className="pt-2">
              <SingleImageUpload
                label="Profile Portrait"
                value={profilePhoto}
                onChange={setProfilePhoto}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Employment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Designation" name="designation" required defaultValue={initialData?.designation} placeholder="e.g. Senior Teacher" />
              <Select
                label="Employment Type"
                name="employmentType"
                required
                defaultValue={initialData?.employmentType}
                options={[
                  { value: 'FULL_TIME', label: 'Full Time' },
                  { value: 'PART_TIME', label: 'Part Time' },
                  { value: 'CONTRACT', label: 'Contract' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Basic Salary (LKR)" name="basicSalary" type="number" required defaultValue={initialData?.basicSalary} placeholder="0.00" />
              <Input label="Joined Date" name="joinedDate" type="date" required defaultValue={initialData?.joinedDate?.split('T')[0]} />
            </div>
            
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2 pt-2">Contact Details</h4>
            <div className="grid grid-cols-1 gap-4">
              <MultiPhoneInput label="Phone Numbers" name="phoneNumbers" initialValues={initialData?.phoneNumbers} />
              <Input label="Email Address" name="email" type="email" defaultValue={initialData?.email} placeholder="teacher@sumayamadrasa.com" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Address Details</h4>
          <Input label="Physical Address" name="address" required defaultValue={initialData?.address} placeholder="House No, Street Name..." />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" name="city" required defaultValue={initialData?.city} />
            <Input label="District" name="district" required defaultValue={initialData?.district} />
            <Input label="Province" name="province" required defaultValue={initialData?.province} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="G.N Division & Number" name="gnDivision" defaultValue={initialData?.gnDivision} placeholder="e.g. 123A, Kelaniya" />
            <Input label="D.S Division" name="dsDivision" defaultValue={initialData?.dsDivision} placeholder="e.g. Kelaniya" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Educational Qualifications</h4>
            <Button type="button" variant="secondary" onClick={addQualification} className="h-7 px-3 text-[10px] font-black uppercase tracking-widest">
              Add More
            </Button>
          </div>
          
          <div className="space-y-4">
            {qualifications.map((qual, index) => (
              <div key={index} className="relative p-4 rounded-2xl bg-gray-50/50 border border-gray-100 group">
                {qualifications.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeQualification(index)}
                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Degree / Qualification"
                    value={qual.degree}
                    onChange={(e) => updateQualification(index, 'degree', e.target.value)}
                    placeholder="e.g. B.A in Islamic Studies"
                  />
                  <Input
                    label="Institution"
                    value={qual.institution}
                    onChange={(e) => updateQualification(index, 'institution', e.target.value)}
                    placeholder="e.g. University of Colombo"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Year"
                      type="number"
                      value={qual.year}
                      onChange={(e) => updateQualification(index, 'year', e.target.value)}
                      placeholder="2020"
                    />
                    <Input
                      label="Field of Study"
                      value={qual.fieldOfStudy}
                      onChange={(e) => updateQualification(index, 'fieldOfStudy', e.target.value)}
                      placeholder="General"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Verification Documents</h4>
          <FileUpload
            label="Identity / Academic Documents"
            multiple
            value={documents}
            onChange={setDocuments}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
          <Button variant="secondary" type="button" onClick={onClose} className="font-bold border-none h-11 px-8">Discard</Button>
          <Button 
            type="submit" 
            disabled={teacherMutation.isPending} 
            className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 px-10 h-11 rounded-xl font-black uppercase tracking-widest text-[11px]"
          >
            {teacherMutation.isPending ? 'Processing...' : (initialData ? 'Update Teacher' : 'Confirm Registration')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TeachersPage;
