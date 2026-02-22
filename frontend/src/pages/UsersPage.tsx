import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Lock, UserX, UserCheck } from 'lucide-react';
import api from '../services/api';
import { User } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { getRoleName, formatDate } from '../utils/helpers';

const UsersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', searchQuery, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      
      const response = await api.get(`/users?${params}`);
      return response.data;
    },
  });

  const users: User[] = usersData?.data || [];

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await api.patch(`/users/${userId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      toast.success('User status updated!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    toggleUserStatusMutation.mutate({ userId: user.id, status: newStatus });
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setIsChangePasswordModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Add User
          </Button>
        </div>
      </Card>

      {/* Search & Filter */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="w-full md:w-64">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PRINCIPAL">Principal</option>
              <option value="VICE_PRINCIPAL">Vice Principal</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="EXPENDITURE_RECEPTIONIST">Expenditure Receptionist</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No users found. Click "Add User" to create a new user.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Full Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Login</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.fullName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{getRoleName(user.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.phoneNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="Edit User"
                        >
                          <Edit size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleChangePassword(user)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="Change Password"
                        >
                          <Lock size={18} className="text-yellow-600" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="rounded p-1 hover:bg-gray-100"
                          title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {user.status === 'ACTIVE' ? (
                            <UserX size={18} className="text-red-600" />
                          ) : (
                            <UserCheck size={18} className="text-green-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}

      {/* Change Password Modal */}
      {selectedUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordModalOpen}
          onClose={() => {
            setIsChangePasswordModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}
    </div>
  );
};

// Add User Modal Component
interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: '',
    email: '',
    phoneNumber: '',
  });

  const queryClient = useQueryClient();

  const addUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User created successfully!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
      setFormData({
        username: '',
        password: '',
        fullName: '',
        role: '',
        email: '',
        phoneNumber: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUserMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New User"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addUserMutation.isPending}>
            {addUserMutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Unique username for login"
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Minimum 8 characters"
          required
        />

        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <Select
          label="Role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          options={[
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
            { value: 'PRINCIPAL', label: 'Principal' },
            { value: 'VICE_PRINCIPAL', label: 'Vice Principal' },
            { value: 'RECEPTIONIST', label: 'Receptionist' },
            { value: 'EXPENDITURE_RECEPTIONIST', label: 'Expenditure Receptionist' },
          ]}
          required
        />

        <Input
          label="Email (Optional)"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />

        <Input
          label="Phone Number (Optional)"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
        />
      </form>
    </Modal>
  );
};

// Edit User Modal Component
interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user }) => {
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    role: user.role,
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
  });

  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/users/${user.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('User updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit User - ${user.username}`}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateUserMutation.isPending}>
            {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <Select
          label="Role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          options={[
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
            { value: 'PRINCIPAL', label: 'Principal' },
            { value: 'VICE_PRINCIPAL', label: 'Vice Principal' },
            { value: 'RECEPTIONIST', label: 'Receptionist' },
            { value: 'EXPENDITURE_RECEPTIONIST', label: 'Expenditure Receptionist' },
          ]}
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />

        <Input
          label="Phone Number"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
        />
      </form>
    </Modal>
  );
};

// Change Password Modal Component
interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, user }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const queryClient = useQueryClient();

  const changePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await api.patch(`/users/${user.id}/password`, { newPassword: password });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      onClose();
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to change password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters!');
      return;
    }

    changePasswordMutation.mutate(newPassword);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change Password - ${user.username}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          required
        />
      </form>
    </Modal>
  );
};

export default UsersPage;
