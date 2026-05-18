import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, HardHat, TrendingUp, Users, Building2, Briefcase, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { SingleImageUpload, FileUpload } from '../components/UI/FileUpload';
import { formatDate, formatCurrency, getFileUrl } from '../utils/helpers';
import { MultiPhoneInput } from '../components/UI/MultiPhoneInput';
import { ActionMenu } from '../components/UI/ActionMenu';

const StaffPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [sortBy, setSortBy] = useState<'id_asc' | 'id_desc' | 'name_asc' | 'name_desc'>('id_asc');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

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

    // Apply sorting
    const sortedStaff = [...staff].sort((a, b) => {
        if (sortBy === 'id_asc') return a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true });
        if (sortBy === 'id_desc') return b.employeeNumber.localeCompare(a.employeeNumber, undefined, { numeric: true });
        if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
        return 0;
    });



    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/staff/${id}`),
        onSuccess: () => {
            toast.success('Staff member deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['staff'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete staff member');
        },
    });

    const handleDeleteStaff = (s: any) => {
        if (window.confirm(`Are you sure you want to delete "${s.fullName}"? This action cannot be undone.`)) {
            deleteMutation.mutate(s.id);
        }
    };

    const ACCENTS = {
        blue:    { gradient: 'from-[#2563eb] to-[#4f46e5]' },
        emerald: { gradient: 'from-[#10b981] to-[#0d9488]' },
        violet:  { gradient: 'from-[#8b5cf6] to-[#7c3aed]' },
        amber:   { gradient: 'from-[#f59e0b] to-[#ea580c]' },
    };

    const stats = [
        { label: 'Total Personnel', value: staff.length, icon: Users, accent: 'blue' as const },
        { label: 'Active Duty', value: staff.filter((s: any) => s.status === 'ACTIVE').length, icon: TrendingUp, accent: 'emerald' as const },
        { label: 'Departments', value: new Set(staff.map((s: any) => s.department)).size, icon: Building2, accent: 'violet' as const },
        { label: 'Avg Salary', value: formatCurrency(staff.reduce((acc: number, s: any) => acc + s.basicSalary, 0) / (staff.length || 1)), icon: Briefcase, accent: 'amber' as const },
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
                        onClick={() => {
                            setEditingStaff(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                        <span className="font-medium text-sm">Register New Staff</span>
                    </Button>
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const a = ACCENTS[stat.accent];
                    return (
                        <Card
                            key={stat.label}
                            className={`group relative overflow-hidden bg-gradient-to-r ${a.gradient} border-none shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.98] border border-white/10`}
                            padding="none"
                        >
                            {/* Curved background accents matching screenshot's circles */}
                            <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />
                            <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/[0.04] pointer-events-none" />

                            <div className="flex items-center justify-between gap-3 relative z-10 p-5">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-white/80 tracking-wider uppercase">{stat.label}</p>
                                    <p className="mt-1 text-2xl font-black text-white tracking-tight leading-none">{stat.value}</p>
                                </div>
                                
                                <div className="relative flex-shrink-0 flex items-center justify-center h-12 w-12">
                                    {/* Glassmorphic Rounded Box matching screenshot */}
                                    <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
                                        <stat.icon size={18} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Search & Filters */}
            <Card className="p-4 border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID, or NIC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 h-11 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
                        />
                    </div>
                    <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Sort:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-11 px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px] text-xs font-medium text-gray-700 cursor-pointer"
                            >
                                <option value="id_asc">Staff ID (A-Z)</option>
                                <option value="id_desc">Staff ID (Z-A)</option>
                                <option value="name_asc">Name (A-Z)</option>
                                <option value="name_desc">Name (Z-A)</option>
                            </select>
                        </div>
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
                {isLoading ? (
                    <div className="p-10 text-center animate-pulse text-sm text-gray-500">Loading personnel data…</div>
                ) : sortedStaff.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 italic">No personnel found matching the criteria.</div>
                ) : (
                    <div className="overflow-x-auto min-h-[240px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Identity</th>
                                    <th className="p-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Department & Role</th>
                                    <th className="p-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Remuneration</th>
                                    <th className="p-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Joined Date</th>
                                    <th className="p-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                    <th className="p-5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-center w-[1%] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedStaff.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-blue-200 transition-colors">
                                                    {s.profilePhoto ? (
                                                        <img src={getFileUrl(s.profilePhoto)} alt="" className="h-full w-full object-cover" />
                                                    ) : <Users size={20} className="text-gray-400" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{s.fullName}</p>
                                                    <p className="text-xs text-gray-500">{s.employeeNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{s.designation}</span>
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{s.department}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{formatCurrency(s.basicSalary)}</span>
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{s.employmentType}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="text-sm font-semibold text-gray-700">{formatDate(s.joinedDate)}</span>
                                        </td>
                                        <td className="p-5">
                                            <Badge variant={s.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[9px] font-black tracking-widest uppercase px-3 py-1">
                                                {s.status}
                                            </Badge>
                                        </td>
                                        <td className="p-5 text-center w-[1%] whitespace-nowrap">
                                            <ActionMenu items={[
                                                { label: 'View', icon: <Eye size={15} />, onClick: () => navigate(`/staff/${s.id}`) },
                                                { label: 'Edit', icon: <Pencil size={15} />, onClick: () => { setEditingStaff(s); setIsModalOpen(true); } },
                                                { label: 'Delete', icon: <Trash2 size={15} />, onClick: () => handleDeleteStaff(s), variant: 'danger' },
                                            ]} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <StaffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingStaff}
            />
        </div>
    );
};

interface StaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any | null;
}

const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, initialData }) => {
    const [profilePhoto, setProfilePhoto] = useState<File | string | null>(null);
    const [documents, setDocuments] = useState<File[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            setProfilePhoto(initialData?.profilePhoto || null);
        }
    }, [isOpen, initialData]);

    const queryClient = useQueryClient();

    const staffMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (initialData) {
                const response = await api.put(`/staff/${initialData.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return response.data;
            } else {
                const response = await api.post('/staff', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return response.data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            toast.success(initialData ? 'Staff record updated successfully' : 'Staff member registered successfully');
            onClose();
            setProfilePhoto(null);
            setDocuments([]);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || `Failed to ${initialData ? 'update' : 'register'} staff`);
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
        documents.forEach((doc) => formData.append('documents', doc));
        staffMutation.mutate(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Update Staff Record' : 'Register New Staff Member'} size="xl">
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Personal Details</h4>
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
                            <Input label="NIC" name="nic" required defaultValue={initialData?.nic} placeholder="NIC Number" />
                            <Input label="Driving License" name="drivingLicenseNo" defaultValue={initialData?.drivingLicenseNo} placeholder="Optional" />
                        </div>
                        <div className="pt-2">
                            <SingleImageUpload
                                label="Profile Portrait"
                                value={profilePhoto}
                                onChange={setProfilePhoto}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Employment Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Department"
                                name="department"
                                required
                                defaultValue={initialData?.department}
                                options={[
                                    { value: 'ADMINISTRATION', label: 'Administration' },
                                    { value: 'ACADEMIC_SUPPORT', label: 'Academic Support' },
                                    { value: 'MAINTENANCE', label: 'Maintenance' },
                                    { value: 'SECURITY', label: 'Security' },
                                    { value: 'TRANSPORT', label: 'Transport' },
                                ]}
                            />
                            <Input label="Designation" name="designation" required defaultValue={initialData?.designation} placeholder="e.g. Accountant" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Employment"
                                name="employmentType"
                                required
                                defaultValue={initialData?.employmentType}
                                options={[
                                    { value: 'FULL_TIME', label: 'Full Time' },
                                    { value: 'PART_TIME', label: 'Part Time' },
                                    { value: 'CONTRACT', label: 'Contract' },
                                ]}
                            />
                            <Input label="Basic Salary (LKR)" name="basicSalary" type="number" required defaultValue={initialData?.basicSalary} placeholder="0.00" />
                        </div>
                        <Input label="Joined Date" name="joinedDate" type="date" required defaultValue={initialData?.joinedDate?.split('T')[0] || new Date().toISOString().split('T')[0]} />
                        
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2 pt-2">Contact Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <MultiPhoneInput label="Phone Numbers" name="phoneNumbers" initialValues={initialData?.phoneNumbers} />
                            <Input label="Email" name="email" type="email" defaultValue={initialData?.email} placeholder="staff@sumayamadrasa.com" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-2">Address Details</h4>
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

                <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                    <Button variant="secondary" type="button" onClick={onClose} className="font-bold border-none h-11 px-8">Discard</Button>
                    <Button 
                        type="submit" 
                        disabled={staffMutation.isPending} 
                        className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 px-10 h-11 rounded-xl font-medium text-sm"
                    >
                        {staffMutation.isPending ? 'Processing...' : (initialData ? 'Update Record' : 'Confirm Registration')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default StaffPage;
