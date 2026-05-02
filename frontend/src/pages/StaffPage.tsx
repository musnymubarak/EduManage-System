import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, HardHat, TrendingUp, Users, Building2, Briefcase, Pencil } from 'lucide-react';
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

const StaffPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [sortBy, setSortBy] = useState<'id_asc' | 'id_desc' | 'name_asc' | 'name_desc'>('id_asc');
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

    // Apply sorting
    const sortedStaff = [...staff].sort((a, b) => {
        if (sortBy === 'id_asc') return a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true });
        if (sortBy === 'id_desc') return b.employeeNumber.localeCompare(a.employeeNumber, undefined, { numeric: true });
        if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
        return 0;
    });



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
                        onClick={() => {
                            setEditingStaff(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 h-12 px-6 rounded-2xl group transition-all transform hover:scale-105 whitespace-nowrap"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                        <span className="font-black uppercase tracking-widest text-[11px]">Register New Staff</span>
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
                            placeholder="Search by name, ID, or NIC..."
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Department & Role</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Remuneration</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined Date</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center w-[1%] whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing Personnel Data...</td>
                                </tr>
                            ) : sortedStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-gray-400 italic">No personnel found matching the criteria.</td>
                                </tr>
                            ) : (
                                sortedStaff.map((s: any) => (
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
                                        <td className="p-5 text-center w-[1%] whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    onClick={() => navigate(`/staff/${s.id}`)}
                                                    variant="secondary"
                                                    className="h-9 w-9 p-0 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm border border-gray-100"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setEditingStaff(s);
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Employment Details</h4>
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
                        <Input label="Joined Date" name="joinedDate" type="date" required defaultValue={initialData?.joinedDate?.split('T')[0]} />
                        
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2 pt-2">Contact Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <MultiPhoneInput label="Phone Numbers" name="phoneNumbers" initialValues={initialData?.phoneNumbers} />
                            <Input label="Email" name="email" type="email" defaultValue={initialData?.email} placeholder="staff@sumayamadrasa.com" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-blue-100 pb-2">Address Details</h4>
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
                        disabled={staffMutation.isPending} 
                        className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 px-10 h-11 rounded-xl font-black uppercase tracking-widest text-[11px]"
                    >
                        {staffMutation.isPending ? 'Processing...' : (initialData ? 'Update Record' : 'Confirm Registration')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default StaffPage;
