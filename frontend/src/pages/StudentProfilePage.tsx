import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  CreditCard, 
  Calendar, 
  FileText, 
  Phone, 
  MapPin, 
  Users, 
  ShieldAlert, 
  Stethoscope,
  Download,
  ExternalLink,
  GraduationCap,
  AlertTriangle,
  LogOut,
  DollarSign,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Student, StudentDetail } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';

const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'fees' | 'attendance' | 'documents'>('overview');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: student, isLoading, error } = useQuery<StudentDetail>({
    queryKey: ['student', id],
    queryFn: async () => {
      const response = await api.get(`/students/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-gray-500 animate-pulse">Loading student profile...</div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="text-lg font-medium text-red-500">Error loading student profile</div>
        <Button onClick={() => navigate('/students')} variant="secondary">
          <ArrowLeft size={18} className="mr-2" /> Back to Students
        </Button>
      </div>
    );
  }

  const attendancePercentage = student.attendance && student.attendance.length > 0
    ? ((student.attendance.filter(a => a.status === 'PRESENT').length / student.attendance.length) * 100).toFixed(1)
    : '0';



  return (
    <div className="space-y-6 pb-12">
      {/* Search & Back Header */}
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate('/students')} variant="secondary" className="bg-white hover:bg-gray-50 border border-gray-200">
          <ArrowLeft size={18} className="mr-2" /> Back to Students
        </Button>
        <div className="flex gap-2 text-sm text-gray-500">
          <span>Students</span> / <span className="font-semibold text-gray-900">{student.fullName}</span>
        </div>
      </div>

      {/* Leaving Status Banner */}
      {student.status === 'INACTIVE' && student.leavingReason && (
        <Card className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-2xl text-red-600">
              <LogOut size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Student has left the institution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Leaving Date</p>
                  <p className="text-sm font-bold text-red-800">{formatDate(student.leavingDate || '')}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Reason for Leaving</p>
                  <p className="text-sm font-bold text-red-800">
                    {student.leavingReason === 'OTHER' ? student.leavingReasonOther : student.leavingReason?.replace(/_/g, ' ')}
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
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="relative">
              <div className="h-32 w-32 overflow-hidden rounded-2xl bg-blue-100 border-4 border-white shadow-md">
                {student.profilePhoto ? (
                  <img 
                    src={student.profilePhoto} 
                    alt={student.fullName} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-blue-500">
                    <User size={48} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2">
                <Badge variant={student.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {student.status}
                </Badge>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{student.fullName}</h1>
                  <p className="text-gray-500 font-medium">Admission No: <span className="text-blue-600 font-bold">{student.admissionNumber}</span></p>
                </div>
                {student.status === 'ACTIVE' && (
                  <Button 
                    variant="secondary" 
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white font-black uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl transition-all"
                  >
                    <LogOut size={16} className="mr-2" />
                    Mark as Left
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Class</p>
                  <p className="text-sm font-bold text-gray-700">{student.class?.name || 'Unassigned'} ({student.class?.grade || '-'})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gender</p>
                  <p className="text-sm font-bold text-gray-700 capitalize">{student.gender.toLowerCase()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined Date</p>
                  <p className="text-sm font-bold text-gray-700">{formatDate(student.admissionDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-sm font-bold text-gray-700">{formatDate(student.dateOfBirth)}</p>
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
          { id: 'academics', label: 'Academics', icon: GraduationCap },
          { id: 'fees', label: 'Fees & Payments', icon: CreditCard },
          { id: 'attendance', label: 'Attendance', icon: Calendar },
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
                <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <DetailItem label="Full Name" value={student.fullName} />
                <DetailItem label="Name with Initials" value={student.nameWithInitials} />
                <DetailItem label="Religion" value={student.religion} />
                <DetailItem label="Nationality" value={student.nationality} />
                <DetailItem label="NIC Number" value={student.nic || 'Not Provided'} />
                <DetailItem label="Birth Certificate No" value={student.birthCertificateNo} />
                <DetailItem label="Blood Group" value={student.bloodGroup || 'Not Provided'} />
                <DetailItem label="Previous School" value={student.previousSchool || 'None'} />
              </div>

              <div className="pt-4 flex items-center gap-2 border-b pb-4">
                <div className="p-2 bg-green-100 rounded-lg text-green-600"><MapPin size={20} /></div>
                <h3 className="text-lg font-bold text-gray-900">Address & Contact</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div className="sm:col-span-2">
                  <DetailItem label="Home Address" value={student.address} fullWidth />
                </div>
                <DetailItem label="City" value={student.city} />
                <DetailItem label="District" value={student.district} />
                <DetailItem label="Province" value={student.province} />
                <DetailItem label="Contact Number" value={student.mobileNumber || student.homePhone || 'Not Provided'} />
              </div>
            </Card>

            {/* Sidebar Details: Guardian & Medical */}
            <div className="space-y-6">
              <Card className="border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Users size={20} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Guardian Info</h3>
                </div>
                <div className="space-y-4">
                  <DetailItem label="Guardian Name" value={student.guardianName} />
                  <DetailItem label="Relationship" value={student.guardianRelationship} />
                  <DetailItem label="NIC" value={student.guardianNIC} />
                  <DetailItem label="Phone" value={student.guardianPhone} icon={<Phone size={14} className="text-blue-500" />} />
                  <DetailItem label="Occupation" value={student.guardianOccupation} />
                </div>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600"><ShieldAlert size={20} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Emergency Details</h3>
                </div>
                <div className="space-y-4">
                  <DetailItem label="Emergency Contact" value={student.emergencyContactName} />
                  <DetailItem label="Phone" value={student.emergencyContactPhone} icon={<Phone size={14} className="text-red-500" />} />
                  <DetailItem label="Relationship" value={student.emergencyRelationship} />
                </div>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Stethoscope size={20} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Medical History</h3>
                </div>
                <div className="space-y-4">
                  <DetailItem label="Medical Conditions" value={student.medicalConditions || 'No conditions reported'} />
                  <DetailItem label="Allergies" value={student.allergies || 'No allergies reported'} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'academics' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Exams" value={student.examMarks?.length || 0} icon={BookOpen} color="blue" />
              <StatCard label="Average Score" value={calculateAverageMark(student.examMarks || [])} suffix="%" icon={GraduationCap} color="green" />
              <StatCard label="Highest Mark" value={calculateMaxMark(student.examMarks || [])} icon={ArrowLeft} color="purple" rotateIcon={90} />
              <StatCard label="Rank in Class" value="N/A" icon={Users} color="orange" />
            </div>

            <Card className="overflow-hidden">
              <div className="border-b bg-gray-50 px-6 py-4">
                <h3 className="font-bold text-gray-900">Exam History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4">Exam Name</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Marks Obtained</th>
                      <th className="px-6 py-4">Grade</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {student.examMarks && student.examMarks.length > 0 ? student.examMarks.map((mark) => (
                      <tr key={mark.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{mark.exam.name}</td>
                        <td className="px-6 py-4 text-gray-600">{mark.exam.subject}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(mark.exam.examDate)}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">{mark.marksObtained}</span>
                          <span className="text-xs text-gray-400"> / {mark.exam.totalMarks}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={mark.grade === 'F' ? 'danger' : 'success'} className="px-3">
                            {mark.grade || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {mark.marksObtained >= mark.exam.passingMarks ? (
                            <span className="text-xs font-bold text-green-600 px-2 py-1 bg-green-50 rounded">PASS</span>
                          ) : (
                            <span className="text-xs font-bold text-red-600 px-2 py-1 bg-red-50 rounded">FAIL</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">No exam records found for this student.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'fees' && (
          <StudentFeeLedger studentId={id!} />
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Attendance %" value={attendancePercentage} suffix="%" icon={Calendar} color="blue" />
              <StatCard label="Total Present" value={student.attendance ? student.attendance.filter(a => a.status === 'PRESENT').length : 0} icon={Calendar} color="green" />
              <StatCard label="Total Absent" value={student.attendance ? student.attendance.filter(a => a.status === 'ABSENT').length : 0} icon={ShieldAlert} color="red" />
            </div>

            <Card className="overflow-hidden">
               <div className="border-b bg-gray-50 px-6 py-4">
                <h3 className="font-bold text-gray-900">Attendance Log</h3>
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
                    {student.attendance && student.attendance.length > 0 ? student.attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatDate(record.date)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusColor(record.status).includes('green') ? 'success' : record.status === 'ABSENT' ? 'danger' : 'warning'}>
                            {record.status}
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
                <h3 className="font-bold text-gray-900">Student Documents</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {student.documents && student.documents.length > 0 ? student.documents.map((doc) => (
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
                    No documents have been uploaded for this student.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Leave Confirmation Modal */}
      <MarkAsLeftModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)} 
        student={student} 
        onSuccess={() => {
          setIsLeaveModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['student', id] });
        }}
      />
    </div>
  );
};

// Mark as Left Modal Component
const MarkAsLeftModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  student: Student;
  onSuccess: () => void;
}> = ({ isOpen, onClose, student, onSuccess }) => {
  const [leavingReason, setLeavingReason] = useState('');
  const [leavingReasonOther, setLeavingReasonOther] = useState('');

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put(`/students/${student.id}/leave`, {
        leavingReason,
        leavingReasonOther
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Student marked as left successfully');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leavingReason) {
      toast.error('Please select a reason');
      return;
    }
    if (leavingReason === 'OTHER' && !leavingReasonOther) {
      toast.error('Please specify the reason');
      return;
    }
    leaveMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Final Termination / Leaving Record" size="md">
      <div className="space-y-6">
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex gap-4">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <div>
            <p className="text-xs font-black text-red-900 uppercase tracking-tight">Warning: Irreversible Action</p>
            <p className="text-xs text-red-700 mt-1">This will mark <b>{student.fullName}</b> as INACTIVE. They will be immediately excluded from all fee calculations and academic trackers.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block">Primary Reason for Leaving</label>
            <select
              value={leavingReason}
              onChange={(e) => setLeavingReason(e.target.value)}
              className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
              required
            >
              <option value="">Select reason...</option>
              <option value="GRADUATED">Graduated</option>
              <option value="LEFT_FOR_ANOTHER_SCHOOL">Left to join another school</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISMISSED_EXPELLED">Dismissed or Expelled</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          {leavingReason === 'OTHER' && (
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block">Specify Detailed Reason</label>
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
              disabled={leaveMutation.isPending} 
              className="bg-red-600 hover:bg-red-700 shadow-xl shadow-red-100 px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[11px]"
            >
              {leaveMutation.isPending ? 'Processing...' : 'Confirm Leaving'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// Subcomponents for cleaner code
const DetailItem: React.FC<{ label: string; value: string | undefined | null; icon?: React.ReactNode; fullWidth?: boolean }> = ({ label, value, icon, fullWidth }) => (
  <div className={`space-y-1 ${fullWidth ? 'w-full' : ''}`}>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-2">
      {icon && icon}
      <p className="text-sm font-bold text-gray-700">{value || '-'}</p>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; suffix?: string; icon: any; color: 'blue' | 'green' | 'red' | 'purple' | 'orange'; rotateIcon?: number }> = ({ label, value, suffix, icon: Icon, color, rotateIcon }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <Card className="flex items-center gap-4 py-6 shadow-sm border-gray-100">
      <div className={`p-4 rounded-2xl ${colors[color]}`} style={rotateIcon ? { transform: `rotate(${rotateIcon}deg)` } : {}}>
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

// Helper functions for stats
const calculateAverageMark = (marks: any[]) => {
  if (marks.length === 0) return 0;
  const totalPercentage = marks.reduce((acc, m) => acc + (m.marksObtained / m.exam.totalMarks) * 100, 0);
  return (totalPercentage / marks.length).toFixed(1);
};

const calculateMaxMark = (marks: any[]) => {
  if (marks.length === 0) return 0;
  return Math.max(...marks.map(m => m.marksObtained));
};

// Student Fee Ledger Component (month-by-month breakdown)
const StudentFeeLedger: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['studentFeeLedger', studentId],
    queryFn: async () => {
      const response = await api.get(`/fees/student/${studentId}/ledger`);
      return response.data.data;
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
        <p className="text-gray-400 mt-4 font-bold text-xs uppercase tracking-widest">Loading fee ledger...</p>
      </div>
    );
  }

  if (!ledgerData) {
    return <div className="py-16 text-center text-gray-400">Could not load fee data.</div>;
  }

  const { monthlyLedger, otherPayments, summary } = ledgerData;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatMonthLabel = (m: string) => {
    const [year, month] = m.split('-').map(Number);
    return `${months[month - 1]} ${year}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'PARTIAL': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MISSING': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Expected" value={formatCurrency(summary.totalExpected)} icon={DollarSign} color="blue" />
        <StatCard label="Total Paid" value={formatCurrency(summary.totalPaid)} icon={CreditCard} color="green" />
        <StatCard label="Total Owed" value={formatCurrency(summary.grandTotalOwed)} icon={ShieldAlert} color="red" />
        <StatCard label="Months Covered" value={`${summary.paidMonths}/${summary.totalMonths}`} icon={Calendar} color="orange" />
      </div>

      {/* Arrears Alert */}
      {summary.missingMonths > 0 && (
        <Card className="bg-red-50 border-2 border-red-100 p-5 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-black text-red-900">
                {summary.missingMonths} month{summary.missingMonths > 1 ? 's' : ''} with no payment record
              </p>
              <p className="text-xs text-red-600 mt-1">
                Missing months are shown as "MISSING" below. Total arrears from missing months: <strong>{formatCurrency(summary.totalBalance)}</strong>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Monthly Ledger Table */}
      <Card className="overflow-hidden border-none shadow-xl rounded-2xl">
        <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
          <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Month-by-Month Fee Ledger</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={14} />
            <span>{summary.totalMonths} months since admission</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4 text-right">Expected</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Balance</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Receipt</th>
                <th className="px-6 py-4">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyLedger.slice().reverse().map((entry: any) => (
                <tr key={entry.month} className={`hover:bg-gray-50/50 transition-colors text-sm ${entry.status === 'MISSING' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{formatMonthLabel(entry.month)}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(entry.expectedAmount)}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(entry.paidAmount)}</td>
                  <td className={`px-6 py-4 text-right font-bold ${entry.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {formatCurrency(entry.balance)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(entry.status)}`}>
                      {entry.status === 'MISSING' ? 'NOT PAID' : entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-blue-600">{entry.receiptNumber || '—'}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{entry.paymentMethod || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr className="font-black text-sm">
                <td className="px-6 py-4 uppercase tracking-widest text-gray-500 text-xs">Total</td>
                <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(summary.totalExpected)}</td>
                <td className="px-6 py-4 text-right text-green-600">{formatCurrency(summary.totalPaid)}</td>
                <td className="px-6 py-4 text-right text-red-600">{formatCurrency(summary.totalBalance)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Other Fees */}
      {otherPayments && otherPayments.length > 0 && (
        <Card className="overflow-hidden border-none shadow-lg rounded-2xl">
          <div className="border-b bg-gray-50 px-6 py-4">
            <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Other Fees (Admission, Exam, etc.)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="px-6 py-4 font-bold text-gray-900">{p.feeType.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(p.paidAmount)}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(p.balance)}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'danger' : 'warning'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-blue-600">{p.receiptNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Grand Total */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl border-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Grand Total Outstanding</p>
            <p className="text-3xl font-black mt-1">{formatCurrency(summary.grandTotalOwed)}</p>
            <p className="text-xs text-gray-400 mt-2">
              Monthly: {formatCurrency(summary.totalBalance)} + Other: {formatCurrency(summary.otherFeesBalance)}
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl">
            <DollarSign size={32} className="text-white/60" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentProfilePage;
