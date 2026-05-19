import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  FileText, 
  Phone, 
  MapPin, 
  Award, 
  Briefcase,
  DollarSign,
  Clock,
  Mail,
  Download,
  ClipboardList,
  Plus,
  Trash2,
  X,
  LogOut,
  AlertTriangle,
  Edit,
  CheckCircle,
  Eye
} from 'lucide-react';
import { Input } from '../components/UI/Input';
import api from '../services/api';
import { TeacherDetail } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency, getFileUrl } from '../utils/helpers';
import { TeacherModal } from './TeachersPage';



const TeacherProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'attendance' | 'documents' | 'memos'>('overview');
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put(`/teachers/${id}`, {
        status: 'ACTIVE',
        leavingDate: null,
        leavingReason: null,
        leavingReasonOther: null
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Teacher profile has been reactivated successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reactivate teacher');
    }
  });

  const handleReactivate = () => {
    if (window.confirm(`Are you sure you want to reactivate "${teacher?.fullName}"?`)) {
      reactivateMutation.mutate();
    }
  };

  const { data: teacher, isLoading, error } = useQuery<TeacherDetail>({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const response = await api.get(`/teachers/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  const addMemoMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await api.post(`/teachers/${id}/memos`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Memo added successfully!');
      setIsMemoModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['teacher', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add memo');
    },
  });

  const deleteMemoMutation = useMutation({
    mutationFn: async (memoId: string) => {
      const response = await api.delete(`/teachers/${id}/memos/${memoId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Memo deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete memo');
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.delete(`/teachers/${id}/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Document deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete document');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-gray-500 animate-pulse">Loading teacher profile...</div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="text-lg font-medium text-red-500">Error loading teacher profile</div>
        <Button onClick={() => navigate('/teachers')} variant="secondary">
          <ArrowLeft size={18} className="mr-2" /> Back to Teachers
        </Button>
      </div>
    );
  }

  const handleAddMemo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    if (!title || !content) {
      toast.error('Both title and content are required');
      return;
    }
    
    addMemoMutation.mutate({ title, content });
  };

  const attendancePercentage = teacher.attendance && teacher.attendance.length > 0
    ? ((teacher.attendance.filter(a => a.status === 'PRESENT').length / teacher.attendance.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate('/teachers')} variant="secondary" className="bg-white hover:bg-gray-50 border border-gray-200">
          <ArrowLeft size={18} className="mr-2" /> Back to Teachers
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-sm text-gray-500 font-bold hidden sm:flex">
            <span>Teachers</span> / <span className="text-gray-900">{teacher.fullName}</span>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm rounded-xl px-4 flex items-center gap-2 h-10 transition-colors">
            <Edit size={16} /> <span className="font-bold text-xs uppercase tracking-wider">Edit Profile</span>
          </Button>
          {teacher.status === 'ACTIVE' && (
            <Button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white shadow-sm rounded-xl px-4 flex items-center gap-2 h-10 transition-all"
            >
              <LogOut size={16} /> <span className="font-black text-xs uppercase tracking-widest">Mark as Left</span>
            </Button>
          )}
          {teacher.status === 'INACTIVE' && (
            <Button 
              onClick={handleReactivate}
              disabled={reactivateMutation.isPending}
              className="bg-green-50 text-green-600 border-green-100 hover:bg-green-600 hover:text-white shadow-sm rounded-xl px-4 flex items-center gap-2 h-10 transition-all"
            >
              <CheckCircle size={16} /> <span className="font-black text-xs uppercase tracking-widest">{reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Teacher'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Leaving Status Banner */}
      {teacher.status === 'INACTIVE' && teacher.leavingReason && (
        <Card className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-2xl text-red-600">
              <LogOut size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Teacher has left the institution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Leaving Date</p>
                  <p className="text-sm font-bold text-red-800">{formatDate(teacher.leavingDate || '')}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Reason for Leaving</p>
                  <p className="text-sm font-bold text-red-800">
                    {teacher.leavingReason === 'OTHER' ? teacher.leavingReasonOther : teacher.leavingReason?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Profile Header Card */}
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative">
              <div className="h-32 w-32 overflow-hidden rounded-2xl bg-blue-100 border-4 border-white shadow-md">
                {teacher.profilePhoto ? (
                  <img 
                    src={getFileUrl(teacher.profilePhoto)} 
                    alt={teacher.fullName} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-blue-500">
                    <User size={48} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2">
                <Badge status={teacher.status}>
                  {teacher.status}
                </Badge>
              </div>
            </div>

            <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{teacher.fullName}</h1>
                    <p className="text-gray-500 font-medium text-lg">{teacher.designation}</p>
                    <p className="text-gray-400 font-medium">Employee No: <span className="text-blue-600 font-bold">{teacher.employeeNumber}</span></p>
                  </div>
                </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-bold text-gray-700">{teacher.employmentType.replace('_', ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gender</p>
                  <p className="text-sm font-bold text-gray-700 capitalize">{teacher.gender.toLowerCase()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined Date</p>
                  <p className="text-sm font-bold text-gray-700">{formatDate(teacher.joinedDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">NIC</p>
                  <p className="text-sm font-bold text-gray-700">{teacher.nic}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'schedule', label: 'Schedule & Subjects', icon: Clock },
          { id: 'attendance', label: 'Attendance & Leaves', icon: Calendar },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'memos', label: 'Internal Memos', icon: ClipboardList }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Details */}
            <Card className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-2 border-b pb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><User size={20} /></div>
                <h3 className="text-lg font-bold text-gray-900">Personal & Employment Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <DetailItem label="Full Name" value={teacher.fullName} />
                <DetailItem label="Name with Initials" value={teacher.nameWithInitials} />
                <DetailItem label="NIC Number" value={teacher.nic} />
                <DetailItem label="Date of Birth" value={formatDate(teacher.dateOfBirth)} />
                <DetailItem label="Joined Date" value={formatDate(teacher.joinedDate)} />
                <DetailItem label="Employment Type" value={teacher.employmentType.replace('_', ' ')} />
                <DetailItem 
                  label="Basic Salary" 
                  value={formatCurrency(teacher.basicSalary)} 
                  icon={<DollarSign size={14} className="text-green-600" />} 
                />
                <DetailItem label="Designation" value={teacher.designation} />
              </div>

              <div className="pt-4 flex items-center gap-2 border-b pb-4">
                <div className="p-2 bg-green-100 rounded-lg text-green-600"><MapPin size={20} /></div>
                <h3 className="text-lg font-bold text-gray-900">Address & Contact</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div className="sm:col-span-2">
                  <DetailItem label="Home Address" value={teacher.address} fullWidth />
                </div>
                <DetailItem label="City" value={teacher.city} />
                <DetailItem label="District" value={teacher.district} />
                <DetailItem 
                  label="Phone Numbers" 
                  value={teacher.phoneNumbers && teacher.phoneNumbers.length > 0 
                    ? teacher.phoneNumbers.join(', ') 
                    : 'Not Provided'} 
                  icon={<Phone size={14} className="text-blue-500" />} 
                />
                <DetailItem label="Email Address" value={teacher.email || 'Not Provided'} icon={<Mail size={14} className="text-blue-500" />} />
              </div>
            </Card>

            {/* Sidebar Details: Qualifications */}
            <div className="space-y-6">
              <Card className="border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Award size={20} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Qualifications</h3>
                </div>
                <div className="space-y-4">
                  {teacher.qualifications && teacher.qualifications.length > 0 ? teacher.qualifications.map((qual, idx) => (
                    <div key={qual.id || idx} className="border-b last:border-0 pb-3 last:pb-0">
                      <p className="font-bold text-gray-900">{qual.qualification}</p>
                      <p className="text-sm text-gray-600">{qual.institution}</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs font-medium text-gray-400">{qual.field || 'N/A'}</span>
                        <span className="text-xs font-bold text-blue-600">{qual.year}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 italic">No qualifications recorded.</p>
                  )}
                </div>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600"><Briefcase size={20} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Status Summary</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Status</span>
                    <Badge status={teacher.status}>{teacher.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Experience</span>
                    <span className="font-bold text-gray-700">Level: Senior</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Workload</span>
                    <span className="font-bold text-gray-700">{teacher.schedules?.length || 0} Periods/Week</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 border-b pb-4 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Clock size={20} /></div>
                <h3 className="text-lg font-bold text-gray-900">Teaching Schedule & Assigned Subjects</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4">Day</th>
                      <th className="px-6 py-4">Time Period</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Room</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teacher.schedules && teacher.schedules.length > 0 ? teacher.schedules.map((slot) => (
                      <tr key={slot.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">{slot.dayOfWeek.charAt(0) + slot.dayOfWeek.slice(1).toLowerCase()}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1 font-medium italic">
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">{slot.subject}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{slot.class.name}</div>
                          <div className="text-xs text-gray-400">Grade {slot.class.grade}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{slot.room || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <Badge variant={slot.isActive ? 'success' : 'default'} className="text-[10px]">
                            {slot.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">No schedule records found for this teacher.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Attendance %" value={attendancePercentage} suffix="%" icon={Calendar} color="blue" />
              <StatCard label="Total Present" value={teacher.attendance ? teacher.attendance.filter(a => a.status === 'PRESENT').length : 0} icon={Calendar} color="green" />
              <StatCard label="Leaves (Total)" value={teacher.attendance ? teacher.attendance.filter(a => ['ABSENT', 'SICK_LEAVE', 'EXCUSED'].includes(a.status)).length : 0} icon={Calendar} color="red" />
            </div>

            <Card className="overflow-hidden">
               <div className="border-b bg-gray-50 px-6 py-4">
                <h3 className="font-bold text-gray-900">Attendance & Leave Log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teacher.attendance && teacher.attendance.length > 0 ? teacher.attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatDate(record.date)}</td>
                        <td className="px-6 py-4">
                          <Badge status={record.status}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{record.remarks || '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-gray-400 font-medium">No attendance records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <Card>
               <div className="border-b bg-gray-50 px-6 py-4 -mx-6 -mt-6 mb-6">
                <h3 className="font-bold text-gray-900">Teacher Documents & Certificates</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacher.documents && teacher.documents.length > 0 ? teacher.documents.map((doc) => (
                  <div key={doc.id} className="flex group items-center justify-between p-4 border rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 group-hover:bg-blue-100 rounded text-gray-500 group-hover:text-blue-600 transition-colors">
                        <FileText size={24} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{doc.fileName}</p>
                        <p className="text-xs text-gray-400 uppercase font-bold">{doc.documentType}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setPreviewDoc({ fileUrl: doc.fileUrl, fileName: doc.fileName });
                            setIsPreviewOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Preview Document"
                        >
                          <Eye size={18} />
                        </button>
                        <a 
                          href={doc.fileUrl} 
                          download
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this document permanently?')) {
                              deleteDocumentMutation.mutate(doc.id);
                            }
                          }}
                          disabled={deleteDocumentMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete Document"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-12 text-center text-gray-400 font-medium flex flex-col items-center gap-2">
                    <FileText size={48} className="text-gray-200" />
                    No documents have been uploaded for this teacher.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Memos Tab */}
        {activeTab === 'memos' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><ClipboardList size={20} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Internal Memos</h3>
                </div>
                <Button onClick={() => setIsMemoModalOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus size={18} className="mr-2" /> Issue Memo
                </Button>
              </div>

              <div className="space-y-4">
                {teacher.memos && teacher.memos.length > 0 ? (
                  teacher.memos.map((memo) => (
                    <div key={memo.id} className="p-6 rounded-xl border border-gray-200 bg-gray-50/50 relative group">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            if (window.confirm('Delete this memo permanently?')) {
                              deleteMemoMutation.mutate(memo.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h4 className="font-bold text-gray-900 text-lg">{memo.title}</h4>
                      <p className="text-xs text-gray-500 font-medium mb-3">Issued by {memo.createdBy} on {formatDate(memo.date)}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{memo.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-medium flex flex-col items-center gap-2">
                    <ClipboardList size={48} className="text-gray-200" />
                    No internal memos have been issued for this teacher.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Memo Modal */}
      {isMemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b p-4 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Issue Internal Memo</h3>
              <button 
                onClick={() => setIsMemoModalOpen(false)}
                className="p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 rounded-md"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddMemo} className="p-6 space-y-4">
              <Input 
                label="Memo/Incident Title" 
                name="title" 
                placeholder="e.g., Performance Commendation, Late Warning" 
                required 
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Details & Remarks</label>
                <textarea 
                  name="content"
                  rows={4}
                  required
                  placeholder="Enter detailed notes here..."
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setIsMemoModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addMemoMutation.isPending} className="bg-orange-600 hover:bg-orange-700 font-black">
                  {addMemoMutation.isPending ? 'Logging...' : 'Issue Memo'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Teacher Edit Modal */}
      <TeacherModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={teacher as any}
      />

      {/* Leave Confirmation Modal */}
      <TeacherMarkAsLeftModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)} 
        teacher={teacher} 
        onSuccess={() => {
          setIsLeaveModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['teacher', id] });
        }}
      />

      {/* ===== DOCUMENT PREVIEW MODAL ===== */}
      {isPreviewOpen && previewDoc && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Top bar */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Document Preview</h3>
                <p className="text-[11px] text-gray-400 font-medium">{previewDoc.fileName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={previewDoc.fileUrl}
                download
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <Download size={16} />
                Download
              </a>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewDoc(null);
                }}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Viewer */}
          <div className="flex-1 p-4 overflow-hidden flex items-center justify-center">
            {/\.(png|jpe?g|webp|gif)$/i.test(previewDoc.fileUrl) ? (
              <img
                src={previewDoc.fileUrl}
                alt={previewDoc.fileName}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl bg-white"
              />
            ) : /\.pdf$/i.test(previewDoc.fileUrl) ? (
              <iframe
                src={previewDoc.fileUrl}
                title="Document Preview"
                className="w-full h-full rounded-xl border border-white/10 shadow-2xl bg-white"
              />
            ) : (
              <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/10 max-w-md text-white">
                <FileText className="mx-auto mb-4 h-16 w-16 text-blue-400" />
                <h4 className="text-lg font-bold">No Inline Preview Available</h4>
                <p className="text-xs text-gray-300 mt-2 mb-6">
                  We can't preview this file format inline. You can download it directly.
                </p>
                <a
                  href={previewDoc.fileUrl}
                  download
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all"
                >
                  <Download size={16} />
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponents
const DetailItem: React.FC<{ label: string; value: string | number | undefined | null; icon?: React.ReactNode; fullWidth?: boolean }> = ({ label, value, icon, fullWidth }) => (
  <div className={`space-y-1 ${fullWidth ? 'w-full' : ''}`}>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-2">
      {icon && icon}
      <p className="text-sm font-bold text-gray-700">{value || '-'}</p>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; suffix?: string; icon: any; color: 'blue' | 'green' | 'red' | 'purple' | 'orange' }> = ({ label, value, suffix, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <Card className="flex items-center gap-4 py-6 shadow-sm border-gray-100">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-900">
          {value}{suffix && <span className="text-sm ml-0.5">{suffix}</span>}
        </p>
      </div>
    </Card>
  );
};


// Mark as Left Modal Component
const TeacherMarkAsLeftModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  teacher: TeacherDetail;
  onSuccess: () => void;
}> = ({ isOpen, onClose, teacher, onSuccess }) => {
  const [leavingReason, setLeavingReason] = useState('');
  const [leavingReasonOther, setLeavingReasonOther] = useState('');
  const [leavingDate, setLeavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leavingReason) {
      toast.error('Please select a reason');
      return;
    }
    if (leavingReason === 'OTHER' && !leavingReasonOther) {
      toast.error('Please specify the reason');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/teachers/${teacher.id}/leave`, {
        leavingReason,
        leavingReasonOther,
        leavingDate
      });
      toast.success('Teacher record updated successfully');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl border-none">
        <div className="flex items-center justify-between border-b p-5 bg-red-50/50">
          <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Final Termination Record</h3>
          <button onClick={onClose} className="p-2 text-red-400 hover:bg-red-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex gap-4">
            <AlertTriangle className="text-red-500 shrink-0" size={24} />
            <div>
              <p className="text-xs font-black text-red-900 uppercase tracking-tight">Warning: Irreversible Action</p>
              <p className="text-xs text-red-700 mt-1">This will mark <b>{teacher.fullName}</b> as INACTIVE. They will be removed from active payroll and schedules.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">Leaving Date</label>
              <input
                type="date"
                value={leavingDate}
                onChange={(e) => setLeavingDate(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">Primary Reason for Leaving</label>
              <select
                value={leavingReason}
                onChange={(e) => setLeavingReason(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
                required
              >
                <option value="">Select reason...</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RETIRED">Retired</option>
                <option value="CONTRACT_EXPIRED">Contract Expired</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            {leavingReason === 'OTHER' && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Specify Detailed Reason</label>
                <textarea
                  value={leavingReasonOther}
                  onChange={(e) => setLeavingReasonOther(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
                  placeholder="Please provide details..."
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <Button variant="secondary" onClick={onClose} className="font-bold border-none hover:bg-gray-100">Cancel</Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="bg-red-600 hover:bg-red-700 shadow-xl shadow-red-100 px-8 h-12 rounded-xl font-medium text-sm"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Termination'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default TeacherProfilePage;
