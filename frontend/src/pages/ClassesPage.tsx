import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building, Users, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Class } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';

const ClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // Fetch classes
  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });

  // Create Class Mutation
  const createMutation = useMutation({
    mutationFn: (newClass: any) => api.post('/classes', newClass),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class created successfully');
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create class');
    },
  });

  // Delete Class Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete class');
    },
  });

  const classes: Class[] = classesData?.data || [];
  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.academicYear.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-gray-600">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Create Class
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes by name or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </Card>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((c) => (
            <div 
              key={c.id} 
              className="group cursor-pointer active:scale-[0.98] transition-all"
              onClick={() => navigate(`/classes/${c.id}`)}
            >
              <Card 
                className="h-full hover:border-blue-500 hover:shadow-md transition-all border border-transparent"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                      <Building size={24} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClass(c);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, c.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{c.name}</h3>
                    <p className="text-sm font-medium text-gray-500">Grade {c.grade}{c.section ? ` - Section ${c.section}` : ''}</p>
                  </div>

                  <div className="flex items-center gap-4 py-2 border-t border-gray-50">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users size={16} className="mr-1.5 text-gray-400" />
                      <span className="font-medium text-gray-900">{(c as any)._count?.students || 0}</span>
                      <span className="ml-1">/ {c.capacity}</span>
                    </div>
                    <Badge variant="info" className="ml-auto">
                      {c.academicYear}
                    </Badge>
                  </div>

                  <div className="flex justify-end pt-2">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      View Details →
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500">
            No classes found matching your search.
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <ClassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={(classData) => createMutation.mutate(classData)}
        title="Create New Class"
      />

      {/* Edit Class Modal */}
      {selectedClass && (
        <ClassModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedClass(null);
          }}
          onSubmit={(_data) => {
            // Update mutation would be here
            toast.error("Update not implemented in this phase");
            setIsEditModalOpen(false);
          }}
          initialData={selectedClass}
          title="Edit Class"
        />
      )}
    </div>
  );
};

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Class;
  title: string;
}

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSubmit, initialData, title }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    grade: initialData?.grade.toString() || '',
    section: initialData?.section || '',
    capacity: initialData?.capacity.toString() || '30',
    academicYear: initialData?.academicYear || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Class Name (e.g., Grade 10-A)"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter class name"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Grade"
            type="number"
            required
            min="0"
            max="14"
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            placeholder="e.g., 10"
          />
          <Input
            label="Section (Optional)"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            placeholder="e.g., A"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Capacity"
            type="number"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="e.g., 30"
          />
          <Input
            label="Academic Year"
            value={formData.academicYear}
            onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
            placeholder="e.g., 2024-2025"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Class' : 'Create Class'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClassesPage;
