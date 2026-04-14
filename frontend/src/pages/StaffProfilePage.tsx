import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    ArrowLeft, 
    User, 
    HardHat,
    Briefcase,
    DollarSign,
    Clock,
    Phone,
    MapPin,
    Mail,
    FileText,
    CheckCircle2,
    Calendar,
    Plus,
    History,
    Download,
    ExternalLink,
    Edit,
    Trash2
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { SingleImageUpload, FileUpload } from '../components/UI/FileUpload';
import { formatDate, formatCurrency } from '../utils/helpers';

import toast from 'react-hot-toast';

const StaffProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'duties' | 'salary' | 'attendance' | 'documents'>('overview');
    const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
    const [editDocuments, setEditDocuments] = useState<File[]>([]);

    const { data: staff, isLoading, error } = useQuery({
        queryKey: ['staff', id],
        queryFn: async () => {
            const response = await api.get(`/staff/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });

    // Mutations
    const assignDutyMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post(`/staff/${id}/duties`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            toast.success('Duty assigned successfully');
            setIsDutyModalOpen(false);
        }
    });

    const updateDutyStatusMutation = useMutation({
        mutationFn: async ({ dutyId, status, remarks }: any) => {
            const response = await api.put(`/staff/${id}/duties/${dutyId}`, { status, remarks });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            toast.success('Duty status updated');
        }
    });

    const deleteDutyMutation = useMutation({
        mutationFn: async (dutyId: string) => {
            const response = await api.delete(`/staff/${id}/duties/${dutyId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            toast.success('Duty removed successfully');
        },
        onError: () => {
            toast.error('Failed to remove duty');
        }
    });

    const recordSalaryMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post(`/staff/${id}/salaries`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            toast.success('Salary payment recorded');
            setIsSalaryModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to record salary');
        }
    });

    const updateStaffMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.put(`/staff/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            toast.success('Staff profile updated successfully');
            setIsEditModalOpen(false);
            setEditProfilePhoto(null);
            setEditDocuments([]);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to update profile');
        }
    });

    const handleUpdateStaff = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (editProfilePhoto) {
            formData.append('profilePhoto', editProfilePhoto);
        }
        editDocuments.forEach((doc) => {
            formData.append('documents', doc);
        });
        updateStaffMutation.mutate(formData);
    };

    if (isLoading) {
        return <div className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase text-[10px] tracking-widest">Hydrating Profile...</div>;
    }

    if (error || !staff) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <p className="text-red-500 font-bold">Personnel record not found.</p>
                <Button onClick={() => navigate('/staff')} variant="secondary">Back to Archive</Button>
            </div>
        );
    }

    const attendancePercentage = staff.attendance && staff.attendance.length > 0
        ? ((staff.attendance.filter((a: any) => a.status === 'PRESENT').length / staff.attendance.length) * 100).toFixed(1)
        : '0';

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button onClick={() => navigate('/staff')} variant="secondary" className="bg-white hover:bg-gray-50 border border-gray-200">
                    <ArrowLeft size={18} className="mr-2" /> Back to Staff Archive
                </Button>
                <div className="flex items-center gap-4">
                    <div className="flex gap-2 text-sm text-gray-500 font-bold hidden sm:flex">
                        <span>Personnel</span> / <span className="text-gray-900">{staff.fullName}</span>
                    </div>
                    <Button onClick={() => setIsEditModalOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm rounded-xl px-4 flex items-center gap-2 h-10 transition-colors">
                        <Edit size={16} /> <span className="font-bold text-xs uppercase tracking-wider">Edit Profile</span>
                    </Button>
                </div>
            </div>


            {/* Profile Header Hero */}
            <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-blue-50/20">
                <div className="p-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="relative group">
                            <div className="h-40 w-40 rounded-3xl bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-2xl relative z-10">
                                {staff.profilePhoto ? (
                                    <img src={staff.profilePhoto} alt="" className="h-full w-full object-cover" />
                                ) : <User size={80} className="text-gray-300" />}
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-white rounded-2xl shadow-lg flex items-center justify-center z-20 border border-gray-100">
                                <HardHat className="text-blue-600" size={24} />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 pt-2">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">{staff.fullName}</h1>
                                    <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[10px] uppercase font-black tracking-widest px-4 py-1">
                                        {staff.status}
                                    </Badge>
                                </div>
                                <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-sm mt-1">{staff.designation} • {staff.department} Dept.</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl">
                                    <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Briefcase size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration</p>
                                        <p className="text-sm font-black text-gray-900">{staff.employeeNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl">
                                    <div className="bg-green-100 text-green-600 p-2 rounded-xl"><DollarSign size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Salary</p>
                                        <p className="text-sm font-black text-gray-900">{formatCurrency(staff.basicSalary)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl">
                                    <div className="bg-purple-100 text-purple-600 p-2 rounded-xl"><Clock size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance</p>
                                        <p className="text-sm font-black text-gray-900">{attendancePercentage}%</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl">
                                    <div className="bg-orange-100 text-orange-600 p-2 rounded-xl"><History size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tenure</p>
                                        <p className="text-sm font-black text-gray-900">{formatDate(staff.joinedDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-8 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex gap-8">
                        {['overview', 'duties', 'salary', 'attendance', 'documents'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                                    activeTab === tab 
                                        ? 'border-blue-600 text-blue-600' 
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Tab Content */}
            <div className="grid grid-cols-1 gap-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 p-8 space-y-8 border-none shadow-lg bg-white rounded-3xl">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                    <User size={20} className="text-blue-500" /> Professional Persona
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Legal Name</p>
                                            <p className="text-gray-900 font-bold">{staff.fullName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Birth Identity (NIC)</p>
                                            <p className="text-gray-900 font-bold">{staff.nic}</p>
                                        </div>
                                        {staff.drivingLicenseNo && (
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Driving License No</p>
                                                <p className="text-gray-900 font-bold">{staff.drivingLicenseNo}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender Classification</p>
                                            <p className="text-gray-900 font-bold uppercase text-xs tracking-widest">{staff.gender}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department Assignment</p>
                                            <Badge variant="info" className="font-black text-[9px] uppercase tracking-widest">{staff.department}</Badge>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Official Designation</p>
                                            <p className="text-gray-900 font-bold">{staff.designation}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employment Structure</p>
                                            <p className="text-gray-900 font-bold">{staff.employmentType}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                    <MapPin size={20} className="text-blue-500" /> Geographic Footprint
                                </h3>
                                <div className="space-y-4 text-gray-700">
                                    <p className="font-bold">{staff.address}</p>
                                    <p className="font-medium">{staff.city}, {staff.district}, {staff.province} / {staff.postalCode || 'No ZIP'}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 space-y-8 border-none shadow-lg bg-white rounded-3xl h-fit">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                <Phone size={20} className="text-blue-500" /> Reachability
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-blue-50">
                                    <div className="bg-white p-3 rounded-xl shadow-sm group-hover:text-blue-600 transition-colors"><Phone size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Line</p>
                                        <p className="text-gray-900 font-bold">{staff.mobileNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group transition-all hover:bg-blue-50">
                                    <div className="bg-white p-3 rounded-xl shadow-sm group-hover:text-blue-600 transition-colors"><Mail size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Electronic Mail</p>
                                        <p className="text-gray-900 font-bold truncate max-w-[150px]">{staff.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-gray-100">
                                <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Collections</p>
                                        <p className="text-3xl font-black">{formatCurrency(staff.basicSalary)}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 flex items-center gap-1 opacity-80">
                                            Current Base Remuneration
                                        </p>
                                    </div>
                                    <DollarSign className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10 group-hover:scale-125 transition-transform duration-500 rotate-12" />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'duties' && (
                    <Card className="p-8 border-none shadow-xl bg-white rounded-3xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Assigned Work Roster</h3>
                                <p className="text-gray-500 font-medium">Tracking vocational responsibilities and operational tasks</p>
                            </div>
                            <Button onClick={() => setIsDutyModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 px-6 rounded-2xl flex items-center gap-2">
                                <Plus size={20} /> <span className="font-black uppercase tracking-widest text-[10px]">Assign New Duty</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staff.duties.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400 italic">No duties currently assigned to this personnel.</div>
                            ) : staff.duties.map((duty: any) => (
                                <Card key={duty.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 rounded-2xl group flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <Badge variant={duty.status === 'COMPLETED' ? 'success' : duty.status === 'CANCELLED' ? 'danger' : 'info'} className="text-[8px] uppercase font-black tracking-widest">
                                                {duty.status}
                                            </Badge>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(duty.assignedDate)}</p>
                                        </div>
                                        <h4 className="text-lg font-black text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{duty.title}</h4>
                                        <p className="text-xs text-gray-500 font-medium line-clamp-3 mb-4">{duty.description || 'No detailed description provided.'}</p>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <Calendar size={14} className="text-blue-400" />
                                            Due: {duty.dueDate ? formatDate(duty.dueDate) : 'No Deadline'}
                                        </div>
                                        <div className="flex gap-2">
                                            {duty.status === 'ASSIGNED' && (
                                                <Button 
                                                    onClick={() => updateDutyStatusMutation.mutate({ dutyId: duty.id, status: 'COMPLETED' })}
                                                    className="h-8 w-8 p-0 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border-green-100 transition-all"
                                                    title="Mark as Completed"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </Button>
                                            )}
                                            <Button 
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to remove this duty?')) {
                                                        deleteDutyMutation.mutate(duty.id);
                                                    }
                                                }}
                                                className="h-8 w-8 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100 transition-all"
                                                title="Remove Duty"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === 'salary' && (
                    <Card className="p-8 border-none shadow-xl bg-white rounded-3xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Salary Remuneration History</h3>
                                <p className="text-gray-500 font-medium">Historical record of monthly payments and financial disbursements</p>
                            </div>
                            <Button onClick={() => setIsSalaryModalOpen(true)} className="bg-green-600 hover:bg-green-700 shadow-xl shadow-green-100 px-6 rounded-2xl flex items-center gap-2">
                                <DollarSign size={18} /> <span className="font-black uppercase tracking-widest text-[10px]">Record New Payment</span>
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Month</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Process Date</th>
                                        <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Basic</th>
                                        <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 text-blue-600">Allowances</th>
                                        <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 text-red-600">Deductions</th>
                                        <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 font-bold">Net Salary</th>
                                        <th className="p-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Audit Trail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {staff.salaryHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center text-gray-400 italic">No salary payment records found in the archive.</td>
                                        </tr>
                                    ) : staff.salaryHistory.map((history: any) => (
                                        <tr key={history.id} className="hover:bg-green-50/20 transition-colors">
                                            <td className="p-5">
                                                <Badge variant="info" className="font-black text-[10px] uppercase tracking-widest px-4 py-1.5">{history.month}</Badge>
                                            </td>
                                            <td className="p-5 text-sm font-medium text-gray-600">{formatDate(history.paymentDate)}</td>
                                            <td className="p-5 text-right text-sm font-bold text-gray-900">{formatCurrency(history.basicSalary)}</td>
                                            <td className="p-5 text-right text-sm font-bold text-blue-600">+{formatCurrency(history.allowances)}</td>
                                            <td className="p-5 text-right text-sm font-bold text-red-600">-{formatCurrency(history.deductions)}</td>
                                            <td className="p-5 text-right">
                                                <p className="font-black text-gray-900 text-lg">{formatCurrency(history.netSalary)}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{history.paymentMethod}</p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-[10px] font-black text-gray-900 uppercase truncate max-w-[80px]">{history.receiptNumber || '—'}</p>
                                                    <p className="text-[9px] font-bold text-blue-400 italic">Paid by HR</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === 'attendance' && (
                    <Card className="p-8 border-none shadow-xl bg-white rounded-3xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Attendance Log</h3>
                                <p className="text-gray-500 font-medium">Tracking physical presence and vocational consistency</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency Rating</p>
                                    <p className="text-2xl font-black text-blue-600">{attendancePercentage}%</p>
                                </div>
                                <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin-slow"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {staff.attendance.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400 italic">No attendance records found for this period.</div>
                            ) : staff.attendance.map((record: any) => (
                                <Card key={record.id} className={`p-4 text-center border shadow-sm rounded-2xl ${
                                    record.status === 'PRESENT' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                                }`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                    <p className="text-xs font-black text-gray-900 mb-2">{formatDate(record.date)}</p>
                                    <Badge variant={record.status === 'PRESENT' ? 'success' : 'danger'} className="text-[8px] font-black px-2">
                                        {record.status}
                                    </Badge>
                                </Card>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === 'documents' && (
                    <Card className="p-8 border-none shadow-xl bg-white rounded-3xl">
                        <h3 className="text-2xl font-black text-gray-900 mb-8">Verification Archives</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staff.documents.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400 italic">No digital credentials found for this personnel.</div>
                            ) : staff.documents.map((doc: any) => (
                                <Card key={doc.id} className="p-5 border border-gray-100 shadow-sm rounded-2xl group hover:border-blue-200 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 p-3 rounded-xl text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-gray-900 truncate max-w-[150px] uppercase text-xs tracking-tight">{doc.fileName}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{doc.documentType}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                            <ExternalLink size={16} />
                                        </a>
                                        <a href={doc.fileUrl} download className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                            <Download size={16} />
                                        </a>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Duty Modal */}
            <Modal isOpen={isDutyModalOpen} onClose={() => setIsDutyModalOpen(false)} title="Assign Operational Duty" size="md">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    assignDutyMutation.mutate({
                        title: formData.get('title'),
                        description: formData.get('description'),
                        dueDate: formData.get('dueDate')
                    });
                }} className="space-y-4">
                    <Input label="Duty Title" name="title" required placeholder="e.g. Campus Perimeter Sweep" />
                    <TextArea label="Description" name="description" rows={3} placeholder="Provide tactical details for the assignment..." />
                    <Input label="Target Completion Date" name="dueDate" type="date" />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsDutyModalOpen(false)}>Discard</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-black px-6">Authorize Duty</Button>
                    </div>
                </form>
            </Modal>

            {/* Salary Modal */}
            <Modal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} title="Process Monthly Disbursement" size="md">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    recordSalaryMutation.mutate({
                        month: formData.get('month'),
                        basicSalary: formData.get('basicSalary'),
                        allowances: formData.get('allowances'),
                        deductions: formData.get('deductions'),
                        paymentMethod: formData.get('paymentMethod'),
                        receiptNumber: formData.get('receiptNumber'),
                        remarks: formData.get('remarks')
                    });
                }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Payroll Month" name="month" placeholder="2024-04" required />
                        <Input label="Process Date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <Input label="Basic Remuneration (LKR)" name="basicSalary" defaultValue={staff.basicSalary} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Total Allowances" name="allowances" placeholder="0.00" />
                        <Input label="Total Deductions" name="deductions" placeholder="0.00" />
                    </div>
                    <Select 
                        label="Disbursement Method" 
                        name="paymentMethod" 
                        required 
                        options={[
                            { value: 'CASH', label: 'Vault (Cash)' },
                            { value: 'BANK_TRANSFER', label: 'Direct Transfer' },
                            { value: 'CHEQUE', label: 'Bank Order' },
                        ]} 
                    />
                    <Input label="Reference / Receipt No" name="receiptNumber" placeholder="REF-XXXXXXXX" />
                    <Input label="Internal Memo" name="remarks" placeholder="Notes for HR auditing..." />
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsSalaryModalOpen(false)}>Discard</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 font-black px-6 shadow-lg shadow-green-100">Confirm Disbursement</Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modify Personnel Details" size="xl">
                <form onSubmit={handleUpdateStaff} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Personal Specifics</h4>
                            <Input label="Full Name" name="fullName" defaultValue={staff.fullName} required />
                            <Input label="Name with Initials" name="nameWithInitials" defaultValue={staff.nameWithInitials} required />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Date of Birth" name="dateOfBirth" type="date" defaultValue={staff.dateOfBirth?.split('T')[0]} required />
                                <Select 
                                    label="Gender" 
                                    name="gender" 
                                    defaultValue={staff.gender}
                                    required 
                                    options={[
                                        { value: 'MALE', label: 'Male' },
                                        { value: 'FEMALE', label: 'Female' },
                                        { value: 'OTHER', label: 'Other' },
                                    ]} 
                                />
                            </div>
                            <Input label="NIC / Identification" name="nic" defaultValue={staff.nic} required />
                            <Input label="Driving License No (Optional)" name="drivingLicenseNo" defaultValue={staff.drivingLicenseNo || ''} />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Employment Parameters</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Department" 
                                    name="department" 
                                    defaultValue={staff.department}
                                    required 
                                    options={[
                                        { value: 'ADMINISTRATION', label: 'Administration' },
                                        { value: 'SECURITY', label: 'Security' },
                                        { value: 'CLEANING', label: 'Cleaning' },
                                        { value: 'MAINTENANCE', label: 'Maintenance' },
                                        { value: 'KITCHEN', label: 'Kitchen' },
                                        { value: 'TRANSPORT', label: 'Transport' },
                                        { value: 'LIBRARY', label: 'Library' },
                                        { value: 'OTHER', label: 'Other' },
                                    ]} 
                                />
                                <Input label="Designation" name="designation" defaultValue={staff.designation} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Employment Type" 
                                    name="employmentType" 
                                    defaultValue={staff.employmentType}
                                    required 
                                    options={[
                                        { value: 'PERMANENT', label: 'Permanent' },
                                        { value: 'CONTRACT', label: 'Contract' },
                                        { value: 'TEMPORARY', label: 'Temporary' },
                                    ]} 
                                />
                                <Input label="Basic Salary (LKR)" name="basicSalary" type="number" defaultValue={staff.basicSalary} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Joined Date" name="joinedDate" type="date" defaultValue={staff.joinedDate?.split('T')[0]} required />
                                <Select 
                                    label="Status" 
                                    name="status" 
                                    defaultValue={staff.status}
                                    required 
                                    options={[
                                        { value: 'ACTIVE', label: 'Active' },
                                        { value: 'INACTIVE', label: 'Inactive' },
                                    ]} 
                                />
                            </div>
                            <div className="pt-2">
                                <SingleImageUpload 
                                    label="Update Profile Portrait" 
                                    value={editProfilePhoto} 
                                    onChange={setEditProfilePhoto} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Contact Context</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Mobile Number" name="mobileNumber" defaultValue={staff.mobileNumber} required />
                            <Input label="Email Address (Optional)" name="email" type="email" defaultValue={staff.email || ''} />
                        </div>
                        <Input label="Physical Address" name="address" defaultValue={staff.address} required />
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="City" name="city" defaultValue={staff.city} required />
                            <Input label="District" name="district" defaultValue={staff.district} required />
                            <Input label="Province" name="province" defaultValue={staff.province} required />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Postal Code (Optional)" name="postalCode" defaultValue={staff.postalCode || ''} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Additional Documents</h4>
                        <FileUpload 
                            label="Upload Documents" 
                            multiple 
                            value={editDocuments}
                            onChange={setEditDocuments}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="font-bold border-none h-11 px-8">Discard Changes</Button>
                        <Button type="submit" disabled={updateStaffMutation.isPending} className="bg-blue-600 hover:bg-blue-700 font-black px-10 shadow-lg h-11">
                            {updateStaffMutation.isPending ? 'Updating...' : 'Save Profile Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StaffProfilePage;
