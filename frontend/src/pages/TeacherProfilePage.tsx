import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Calendar, 
  FileText, 
  Phone, 
  MapPin, 
  Award, 
  Briefcase,
  DollarSign,
  Download,
  ExternalLink,
  Clock,
  Mail
} from 'lucide-react';
import api from '../services/api';
import { TeacherDetail } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';

const TeacherProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'attendance' | 'documents'>('overview');

  const { data: teacher, isLoading, error } = useQuery<TeacherDetail>({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const response = await api.get(`/teachers/${id}`);
      return response.data.data;
    },
    enabled: !!id,
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
        <div className="flex gap-2 text-sm text-gray-500">
          <span>Teachers</span> / <span className="font-semibold text-gray-900">{teacher.fullName}</span>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative">
              <div className="h-32 w-32 overflow-hidden rounded-2xl bg-blue-100 border-4 border-white shadow-md">
                {teacher.profilePhoto ? (
                  <img 
                    src={teacher.profilePhoto} 
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
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{teacher.fullName}</h1>
                <p className="text-gray-500 font-medium text-lg">{teacher.designation}</p>
                <p className="text-gray-400 font-medium">Employee No: <span className="text-blue-600 font-bold">{teacher.employeeNumber}</span></p>
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
          { id: 'documents', label: 'Documents', icon: FileText }
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
                <DetailItem label="Mobile Number" value={teacher.mobileNumber} icon={<Phone size={14} className="text-blue-500" />} />
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
                       <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Document"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <a 
                          href={doc.fileUrl} 
                          download
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </a>
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
      </div>
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

export default TeacherProfilePage;
