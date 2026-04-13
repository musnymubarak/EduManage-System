import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  GraduationCap
} from 'lucide-react';
import api from '../services/api';
import { StudentDetail } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';

const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'fees' | 'attendance' | 'documents'>('overview');

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

  const totalPaid = student.feePayments ? student.feePayments.reduce((acc, curr) => acc + curr.paidAmount, 0) : 0;
  const totalBalance = student.feePayments ? student.feePayments.reduce((acc, curr) => acc + curr.balance, 0) : 0;

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

      {/* Profile Header Card */}
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
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
                <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                  {student.status}
                </Badge>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{student.fullName}</h1>
                <p className="text-gray-500 font-medium">Admission No: <span className="text-blue-600 font-bold">{student.admissionNumber}</span></p>
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Paid" value={formatCurrency(totalPaid)} icon={CreditCard} color="green" />
              <StatCard label="Outstanding Balance" value={formatCurrency(totalBalance)} icon={ShieldAlert} color="red" />
              <StatCard label="Last Payment" value={student.feePayments && student.feePayments[0] ? formatDate(student.feePayments[0].paymentDate || '') : 'None'} icon={Calendar} color="blue" />
            </div>

            <Card className="overflow-hidden">
               <div className="border-b bg-gray-50 px-6 py-4">
                <h3 className="font-bold text-gray-900">Fee Payment History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4">Fee Type / Month</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Paid</th>
                      <th className="px-6 py-4">Balance</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Receipt No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {student.feePayments && student.feePayments.length > 0 ? student.feePayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50/80 transition-colors text-sm">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{payment.feeType.replace('_', ' ')}</div>
                          <div className="text-xs text-gray-400">{payment.month || 'Other'}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 font-bold text-green-600">{formatCurrency(payment.paidAmount)}</td>
                        <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(payment.balance)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={payment.status === 'PAID' ? 'success' : payment.status === 'PENDING' ? 'danger' : 'warning'}>
                            {payment.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-500">#{payment.receiptNumber || 'N/A'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">No fee payment records found.</td>
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
    </div>
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

export default StudentProfilePage;
