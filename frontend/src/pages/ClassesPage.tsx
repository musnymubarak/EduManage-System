import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building, Users, Trash2, Edit, RefreshCw, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Class } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { ActionMenu } from '../components/UI/ActionMenu';

const GRADIENTS = [
  { gradient: 'from-[#2563eb] to-[#4f46e5]' }, // blue
  { gradient: 'from-[#10b981] to-[#0d9488]' }, // emerald
  { gradient: 'from-[#8b5cf6] to-[#7c3aed]' }, // violet
  { gradient: 'from-[#f59e0b] to-[#ea580c]' }, // amber
  { gradient: 'from-[#ef4444] to-[#db2777]' }, // rose
  { gradient: 'from-[#06b6d4] to-[#0891b2]' }, // teal
  { gradient: 'from-[#ec4899] to-[#be185d]' }, // pink
  { gradient: 'from-[#6366f1] to-[#4f46e5]' }, // indigo
];

const ClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAcademicYearsModalOpen, setIsAcademicYearsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [sortBy, setSortBy] = useState<'grade_asc' | 'grade_desc' | 'name_asc' | 'name_desc'>('grade_asc');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('');

  const canMigrate = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Fetch Academic Years
  const { data: academicYearsResp } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get('/academic-years');
      return response.data.data;
    },
  });
  const academicYears = academicYearsResp || [];

  React.useEffect(() => {
    if (!selectedYearFilter && academicYears.length > 0) {
      const active = academicYears.find((ay: any) => ay.isCurrent);
      if (active) {
        setSelectedYearFilter(active.year);
      }
    }
  }, [academicYears]);

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

  // Update Class Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/classes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class updated successfully');
      setIsEditModalOpen(false);
      setSelectedClass(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update class');
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
  
  // Apply filtering and then sorting
  const filteredClasses = [...classes]
    .filter(c => {
      // Search term match
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Academic year match
      const matchesYear = 
        selectedYearFilter === 'all' || 
        selectedYearFilter === '' || 
        c.academicYear === selectedYearFilter;
      
      return matchesSearch && matchesYear;
    })
    .sort((a, b) => {
      if (sortBy === 'grade_asc') return a.grade - b.grade || a.name.localeCompare(b.name);
      if (sortBy === 'grade_desc') return b.grade - a.grade || a.name.localeCompare(b.name);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });


  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-gray-600">Loading classes...</div>
      </div>
    );
  }

  const activeYear = academicYears.find((ay: any) => ay.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
            {activeYear && (
              <Badge variant="success" className="font-black text-xs uppercase tracking-wider px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 rounded-lg shadow-sm">
                <CheckCircle size={13} className="stroke-[3]" /> Active: {activeYear.year}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canMigrate && (
              <>
                <Button 
                  onClick={() => setIsAcademicYearsModalOpen(true)} 
                  variant="outline" 
                  className="hover:border-indigo-500 hover:text-indigo-600 active:scale-95 transition-all font-black text-xs uppercase tracking-wider h-10 px-4"
                >
                  <Calendar size={16} className="mr-2 text-indigo-600" />
                  Academic Years
                </Button>
                <Button 
                  onClick={() => navigate('/migration')} 
                  variant="outline" 
                  className="hover:border-blue-500 hover:text-blue-600 active:scale-95 transition-all font-black text-xs uppercase tracking-wider h-10 px-4"
                >
                  <RefreshCw size={16} className="mr-2 text-blue-600" />
                  Annual Migration
                </Button>
              </>
            )}
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="active:scale-95 transition-all font-black text-xs uppercase tracking-wider h-10 px-4"
            >
              <Plus size={20} className="mr-2" />
              Create Class
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters & Sorting */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            {/* Academic Year Filter Selector */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <label className="text-xs font-black text-gray-500 whitespace-nowrap uppercase tracking-wider">Academic Year:</label>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="rounded-xl border border-gray-200 py-2 px-4 text-sm font-bold text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-all cursor-pointer shadow-sm min-w-[170px]"
              >
                <option value="all">All Academic Years</option>
                {academicYears.map((ay: any) => (
                  <option key={ay.id} value={ay.year}>
                    {ay.year} {ay.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By Selector */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <label className="text-xs font-black text-gray-500 whitespace-nowrap uppercase tracking-wider">Sort By:</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-gray-200 py-2 px-4 text-sm font-bold text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-all cursor-pointer shadow-sm min-w-[170px]"
              >
                <option value="grade_asc">Grade (Low to High)</option>
                <option value="grade_desc">Grade (High to Low)</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((c, index) => {
            const g = GRADIENTS[index % GRADIENTS.length];
            return (
              <div 
                key={c.id} 
                className="group cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => navigate(`/classes/${c.id}`)}
              >
                <Card 
                  className={`h-full relative overflow-hidden bg-gradient-to-r ${g.gradient} border-none shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] border border-white/10`}
                  padding="none"
                >
                  {/* Curved background accents matching screenshot's circles */}
                  <div className="absolute right-0 top-0 -mr-6 -mt-6 w-28 h-28 rounded-full bg-white/[0.07] pointer-events-none" />
                  <div className="absolute right-4 top-4 w-14 h-14 rounded-full bg-white/[0.04] pointer-events-none" />

                  <div className="p-6 space-y-4 relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
                          <Building size={22} className="stroke-[2.5]" />
                        </div>
                        <div onClick={(e) => e.stopPropagation()} className="relative z-20">
                          <div className="bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                            <ActionMenu items={[
                              { label: 'Edit', icon: <Edit size={15} />, onClick: () => { setSelectedClass(c); setIsEditModalOpen(true); } },
                              { label: 'Delete', icon: <Trash2 size={15} />, onClick: () => { if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) { deleteMutation.mutate(c.id); } }, variant: 'danger' },
                            ]} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-xl font-black text-white tracking-tight leading-tight">{c.name}</h3>
                        <p className="text-xs font-bold text-white/80 mt-1 uppercase tracking-wider">Grade {c.grade}{c.section ? ` • Section ${c.section}` : ''}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-4 py-3 border-t border-white/15 mt-2">
                        <div className="flex items-center text-sm text-white/80">
                          <Users size={16} className="mr-1.5 text-white/60 stroke-[2.5]" />
                          <span className="font-black text-white">{(c as any)._count?.students || 0}</span>
                          <span className="ml-1 text-white/60 font-semibold">/ {c.capacity}</span>
                        </div>
                        <Badge className="ml-auto bg-white/15 border-none text-white font-black text-[10px] tracking-wider px-2.5 py-0.5 rounded-lg shadow-inner ring-0">
                          {c.academicYear}
                        </Badge>
                      </div>

                      <div className="flex justify-end pt-1">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:translate-x-1 transition-transform duration-300">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })
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
        academicYears={academicYears}
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
          onSubmit={(data) => {
            updateMutation.mutate({ id: selectedClass.id, data });
          }}
          initialData={selectedClass}
          academicYears={academicYears}
          title="Edit Class"
        />
      )}

      {/* Manage Academic Years Modal */}
      <AcademicYearsModal
        isOpen={isAcademicYearsModalOpen}
        onClose={() => setIsAcademicYearsModalOpen(false)}
      />
    </div>
  );
};

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Class;
  academicYears: any[];
  title: string;
}

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSubmit, initialData, academicYears, title }) => {
  const defaultYear = initialData?.academicYear || academicYears.find((ay: any) => ay.isCurrent)?.year || '';
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    grade: initialData?.grade.toString() || '',
    section: initialData?.section || '',
    capacity: initialData?.capacity.toString() || '30',
    academicYear: defaultYear,
  });

  // Re-sync default year when academicYears loaded or modal re-opened
  React.useEffect(() => {
    if (!formData.academicYear && academicYears.length > 0) {
      setFormData(prev => ({
        ...prev,
        academicYear: academicYears.find((ay: any) => ay.isCurrent)?.year || ''
      }));
    }
  }, [academicYears, isOpen]);

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
        <div className="grid grid-cols-2 gap-4 items-end">
          <Input
            label="Capacity"
            type="number"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="e.g., 30"
          />
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1">Academic Year</label>
            {academicYears && academicYears.length > 0 ? (
              <select
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                required
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer w-full h-11"
              >
                <option value="">-- Select Year --</option>
                {academicYears.map((ay: any) => (
                  <option key={ay.id} value={ay.year}>
                    {ay.year} {ay.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                required
                placeholder="e.g., 2026-2027"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl font-bold h-11 px-5">
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5 rounded-xl">
            {initialData ? 'Update Class' : 'Create Class'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ==========================================
   ACADEMIC YEARS MANAGEMENT MODAL COMPONENT
   ========================================== */
interface AcademicYearsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AcademicYearsModal: React.FC<AcademicYearsModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    year: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  });

  // Fetch Academic Years
  const { data: yearsResponse, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get('/academic-years');
      return response.data.data;
    },
    enabled: isOpen
  });

  const years = yearsResponse || [];

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newYear: any) => api.post('/academic-years', newYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      toast.success('Academic Year created successfully!');
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create academic year');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/academic-years/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      toast.success('Academic Year updated successfully!');
      setIsFormOpen(false);
      setEditingYear(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update academic year');
    },
  });

  // Set Current Mutation
  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => api.put(`/academic-years/${id}/set-current`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Current active academic year updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to set active academic year');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academic-years/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      toast.success('Academic Year deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete academic year');
    },
  });

  const resetForm = () => {
    setFormData({
      year: '',
      startDate: '',
      endDate: '',
      isCurrent: false
    });
  };

  const handleEditClick = (year: any) => {
    setEditingYear(year);
    setFormData({
      year: year.year,
      startDate: new Date(year.startDate).toISOString().split('T')[0],
      endDate: new Date(year.endDate).toISOString().split('T')[0],
      isCurrent: year.isCurrent
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.year.match(/^\d{4}-\d{4}$/) && !formData.year.match(/^\d{4}$/)) {
      toast.error('Academic year must be formatted as YYYY-YYYY or YYYY (e.g. 2026-2027)');
      return;
    }
    
    if (editingYear) {
      updateMutation.mutate({ id: editingYear.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, yearStr: string) => {
    if (window.confirm(`Are you sure you want to delete academic year ${yearStr}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Academic Years" size="lg">
      <div className="space-y-4">
        {/* Toggle Form / List */}
        {!isFormOpen ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-505 font-medium">
                Configure cycle codes, periods, and activate the current academic year registry.
              </p>
              <Button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider h-9 px-4 rounded-xl flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Year
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-sm font-semibold text-gray-500 animate-pulse">
                Loading academic year list...
              </div>
            ) : years.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                <Calendar className="h-10 w-10 mx-auto text-gray-300 stroke-[1.5] mb-2" />
                <p className="text-xs font-bold text-gray-500">No Academic Years Defined</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                {years.map((year: any) => (
                  <div key={year.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-800 tracking-tight">{year.year}</span>
                        {year.isCurrent && (
                          <span className="text-[9px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <CheckCircle size={10} className="stroke-[3.5]" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-405 font-medium">
                        Timeline: {formatDate(year.startDate)} – {formatDate(year.endDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!year.isCurrent && (
                        <button
                          onClick={() => setCurrentMutation.mutate(year.id)}
                          disabled={setCurrentMutation.isPending}
                          className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClick(year)}
                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-gray-55 active:scale-95 transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      {!year.isCurrent && (
                        <button
                          onClick={() => handleDelete(year.id, year.year)}
                          disabled={deleteMutation.isPending}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 active:scale-95 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl font-bold h-11 px-6">
                Close Settings
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <h4 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Calendar size={16} className="text-indigo-600" />
              {editingYear ? `Edit Academic Year: ${editingYear.year}` : 'Add New Academic Year'}
            </h4>
            <Input
              label="Academic Year Code (e.g., 2026-2027)"
              required
              placeholder="e.g. 2026-2027"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="modalIsCurrentCheckbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                checked={formData.isCurrent}
                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
              />
              <label htmlFor="modalIsCurrentCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Set as active current academic year
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingYear(null);
                  resetForm();
                }}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs uppercase tracking-wider h-11 px-5 rounded-xl active:scale-95 transition-all"
              >
                Back to List
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider h-11 px-5 rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-100"
              >
                Save Year
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ClassesPage;
