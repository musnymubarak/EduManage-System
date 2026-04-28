import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, HardHat, TrendingUp, Users, Building2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { SingleImageUpload, FileUpload } from '../components/UI/FileUpload';
import { formatDate, formatCurrency } from '../utils/helpers';

const StaffPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [documents, setDocuments] = useState<File[]>([]);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch staff
    const { data: staffData, isLoading } = useQuery({
        queryKey: ['staff', searchQuery, statusFilter, deptFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter) params.append('status', statusFilter);
            if (deptFilter) params.append('department', deptFilter);

            const response = await api.get(`/staff?${params}`);
            return response.data;
        },
    });

    const staff = staffData?.data || [];

    // Registration mutation
    const registerMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.post('/staff', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            toast.success('Staff member registered successfully');
            setIsAddModalOpen(false);
            setProfilePhoto(null);
            setDocuments([]);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to register staff');
        },
    });

    const handleAddStaff = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Append files manually if they exist in state
        if (profilePhoto) {
            formData.append('profilePhoto', profilePhoto);
        }

        documents.forEach((doc) => {
            formData.append('documents', doc);
        });

        registerMutation.mutate(formData);
    };

    const stats = [
        { label: 'Total Personnel', value: staff.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Duty', value: staff.filter((s: any) => s.status === 'ACTIVE').length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Departments', value: new Set(staff.map((s: any) => s.department)).size, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Avg Salary', value: formatCurrency(staff.reduce((acc: number, s: any) => acc + s.basicSalary, 0) / (staff.length || 1)), icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between py-2">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Staff Management</h2>
                    <p className="text-gray-500 mt-1 font-medium flex items-center gap-2 truncate">
                        <HardHat size={16} className="text-blue-500" />
                        Administration of non-academic personnel and utility teams
                    </p>
                </div>
                <div className="flex flex-row items-center gap-3 shrink-0 flex-nowrap">
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                        <span className="font-black uppercase tracking-widest text-[11px]">Add New Personnel</span>
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
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID, or NIC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 h-11 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-row gap-3">
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px] text-sm font-bold text-gray-600"
                        >
                            <option value="">All Departments</option>
                            <option value="ADMINISTRATION">Administration</option>
                            <option value="SECURITY">Security</option>
                            <option value="CLEANING">Cleaning</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="KITCHEN">Kitchen</option>
                            <option value="TRANSPORT">Transport</option>
                            <option value="LIBRARY">Library</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[120px] text-sm font-bold text-gray-600"
                        >
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Staff Table */}
            <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Department & Role</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Remuneration</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined Date</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing Personnel Data...</td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-gray-400 italic">No personnel found matching the criteria.</td>
                                </tr>
                            ) : (
                                staff.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-blue-200 transition-colors">
                                                    {s.profilePhoto ? (
                                                        <img src={s.profilePhoto} alt="" className="h-full w-full object-cover" />
                                                    ) : <Users size={20} className="text-gray-400" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{s.fullName}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{s.employeeNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{s.designation}</span>
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{s.department}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 font-black text-gray-900">
                                            {formatCurrency(s.basicSalary)}
                                            <span className="block text-[9px] text-gray-400 font-bold tracking-tighter uppercase">{s.employmentType}</span>
                                        </td>
                                        <td className="p-5 text-gray-500 font-medium text-sm">
                                            {formatDate(s.joinedDate)}
                                        </td>
                                        <td className="p-5">
                                            <Badge variant={s.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[9px] font-black tracking-widest uppercase px-3 py-1">
                                                {s.status}
                                            </Badge>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center justify-center">
                                                <Button
                                                    onClick={() => navigate(`/staff/${s.id}`)}
                                                    variant="secondary"
                                                    className="h-9 w-9 p-0 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm border border-gray-100"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Registration Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Staff Member" size="xl">
                <form onSubmit={handleAddStaff} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Personal Details</h4>
                            <Input label="Full Name" name="fullName" required placeholder="e.g. John Doe" />
                            <Input label="Name with Initials" name="nameWithInitials" required placeholder="e.g. J. Doe" />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Date of Birth" name="dateOfBirth" type="date" required />
                                <Select
                                    label="Gender"
                                    name="gender"
                                    required
                                    options={[
                                        { value: 'MALE', label: 'Male' },
                                        { value: 'FEMALE', label: 'Female' },
                                        { value: 'OTHER', label: 'Other' },
                                    ]}
                                />
                            </div>
                            <Input label="NIC / Identification" name="nic" required placeholder="Identification Number" />
                            <Input label="Driving License No (Optional)" name="drivingLicenseNo" placeholder="Optional DL Number" />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Employment Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Department"
                                    name="department"
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
                                <Input label="Designation" name="designation" required placeholder="e.g. Head Security" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Employment Type"
                                    name="employmentType"
                                    required
                                    options={[
                                        { value: 'PERMANENT', label: 'Permanent' },
                                        { value: 'CONTRACT', label: 'Contract' },
                                        { value: 'TEMPORARY', label: 'Temporary' },
                                    ]}
                                />
                                <Input label="Basic Salary (LKR)" name="basicSalary" type="number" required placeholder="0.00" />
                            </div>
                            <Input label="Joined Date" name="joinedDate" type="date" required />
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
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Contact Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Mobile Number" name="mobileNumber" required placeholder="+94 7X XXX XXXX" />
                            <Input label="Email Address (Optional)" name="email" type="email" placeholder="staff@sumayamadrasa.com" />
                        </div>
                        <Input label="Physical Address" name="address" required placeholder="House No, Street Name..." />
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="City" name="city" required />
                            <Input label="District" name="district" required />
                            <Input label="Province" name="province" required />
                        </div>
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
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} className="font-bold border-none h-11 px-8">Discard</Button>
                        <Button type="submit" disabled={registerMutation.isPending} className="bg-blue-600 hover:bg-blue-700 font-black px-10 shadow-lg h-11">
                            {registerMutation.isPending ? 'Processing Registration...' : 'Submit'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StaffPage;
