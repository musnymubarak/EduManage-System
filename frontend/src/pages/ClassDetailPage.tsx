import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  FileText, 
  CalendarCheck,
  Plus,
  Trash2,
  UserPlus,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
// import { Class, Student } from '../types'; // Removed unused imports
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate } from '../utils/helpers'; // Removed unused formatCurrency

const ClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const queryClient = useQueryClient(); // Removed unused queryClient
  const [activeTab, setActiveTab] = useState<'students' | 'subjects' | 'exams' | 'attendance'>('students');

  // Fetch class details
  const { data: classResp, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: async () => {
      const response = await api.get(`/classes/${id}`);
      return response.data;
    },
  });

  const classData = classResp?.data;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-gray-600">Loading class details...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="text-lg font-medium text-red-500">Class not found</div>
        <Button onClick={() => navigate('/classes')} variant="secondary">
          <ArrowLeft size={18} className="mr-2" /> Back to Classes
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'subjects', label: 'Subjects & Teachers', icon: BookOpen },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate('/classes')} variant="secondary" className="bg-white hover:bg-gray-50 border border-gray-200">
          <ArrowLeft size={18} className="mr-2" /> Back to Classes
        </Button>
        <div className="flex gap-2 text-sm text-gray-500">
          <span>Classes</span> / <span className="text-blue-600 font-medium">{classData.name}</span>
        </div>
      </div>

      {/* Class Overview Card */}
      <Card className="overflow-hidden border-none shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <span className="text-2xl font-bold">{classData.name.substring(0, 2)}</span>
          </div>
          
          <div className="flex-1 space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">{classData.name}</h2>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-1.5 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Grade {classData.grade}
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-full">
                Year: {classData.academicYear}
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-full">
                Section: {classData.section || 'N/A'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:border-l md:pl-8 border-gray-100">
            <div className="text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Students</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{classData._count?.students || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Capacity</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{classData.capacity}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-2 pt-2 rounded-t-xl sticky top-0 z-10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-transparent">
        {activeTab === 'students' && (
          <StudentsTab classId={id!} students={classData.students || []} />
        )}
        {activeTab === 'subjects' && (
          <SubjectsTab classId={id!} schedules={classData.schedules || []} />
        )}
        {activeTab === 'exams' && (
          <ClassExamsTab exams={classData.exams || []} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab />
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StudentsTab: React.FC<{ classId: string; students: any[] }> = ({ classId, students }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const removeMutation = useMutation({
    mutationFn: (studentId: string) => api.delete(`/classes/${classId}/students/${studentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      toast.success('Student removed from class');
    },
    onError: () => toast.error('Failed to remove student')
  });

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Enrolled Students</h3>
          <Button size="sm" onClick={() => setIsAddStudentModalOpen(true)}>
            <UserPlus size={18} className="mr-2" /> Add Student
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Admission No</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr 
                  key={student.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/students/${student.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold overflow-hidden border border-white shadow-sm">
                        {student.profilePhoto ? (
                          <img src={student.profilePhoto} alt="" className="h-full w-full object-cover" />
                        ) : student.fullName.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-900">{student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{student.admissionNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      student.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {student.gender}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>{student.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Remove this student from class?')) {
                          removeMutation.mutate(student.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No students assigned to this class yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Student Modal */}
      <AddStudentToClassModal 
        isOpen={isAddStudentModalOpen} 
        onClose={() => setIsAddStudentModalOpen(false)}
        classId={classId}
      />
    </>
  );
};

const AddStudentToClassModal: React.FC<{ isOpen: boolean; onClose: () => void; classId: string }> = ({ isOpen, onClose, classId }) => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: studentsResp, isLoading } = useQuery({
    queryKey: ['students-search', search],
    queryFn: async () => {
      const response = await api.get(`/students?search=${search}&limit=5`);
      return response.data;
    },
    enabled: isOpen && search.length > 1
  });

  const addMutation = useMutation({
    mutationFn: (studentId: string) => api.post(`/classes/${classId}/students`, { studentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      toast.success('Student added successfully');
      onClose();
    },
    onError: () => toast.error('Failed to add student')
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Student to Class">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student by name or admission №..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-sm text-gray-500">Searching...</div>
          ) : studentsResp?.data?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div>
                <p className="text-sm font-bold text-gray-900">{s.fullName}</p>
                <p className="text-xs text-gray-500">{s.admissionNumber}</p>
              </div>
              <Button size="sm" onClick={() => addMutation.mutate(s.id)}>Add</Button>
            </div>
          ))}
          {search.length > 1 && studentsResp?.data?.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">No students found</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const SubjectsTab: React.FC<{ classId: string; schedules: any[] }> = ({ classId, schedules }) => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Subjects & Assigned Teachers</h3>
          <Button size="sm" onClick={() => setIsAssignModalOpen(true)}>
            <Plus size={18} className="mr-2" /> Assign Teacher
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                        <BookOpen size={16} />
                      </div>
                      <span className="font-bold text-gray-900">{schedule.subject}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-700">{schedule.teacher.fullName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 capitalize">{schedule.dayOfWeek.toLowerCase()}</span>
                      <span>{schedule.startTime} - {schedule.endTime}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No subjects or teachers assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Assign Teacher Modal */}
      <AssignTeacherModal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)}
        classId={classId}
      />
    </>
  );
};

const AssignTeacherModal: React.FC<{ isOpen: boolean; onClose: () => void; classId: string }> = ({ isOpen, onClose, classId }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    teacherId: '',
    subject: '',
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    endTime: '09:00',
    room: ''
  });

  const { data: teachersResp } = useQuery({
    queryKey: ['teachers-all'],
    queryFn: async () => {
      const resp = await api.get('/teachers?limit=100');
      return resp.data;
    },
    enabled: isOpen
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => api.post('/schedules', { ...data, classId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      toast.success('Teacher assigned successfully');
      onClose();
    },
    onError: () => toast.error('Failed to assign teacher')
  });

  const subjects = ['Arabic', 'Quran', 'Islamic Studies', 'Mathematics', 'English', 'Science', 'History', 'Other'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Teacher & Subject">
      <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(formData); }} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
          <select 
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          >
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Teacher</label>
          <select 
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.teacherId}
            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
            required
          >
            <option value="">Select Teacher</option>
            {teachersResp?.data?.map((t: any) => (
              <option key={t.id} value={t.id}>{t.fullName} ({t.employeeNumber})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Day</label>
            <select 
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
            >
              {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
             <label className="mb-2 block text-sm font-medium text-gray-700">Room (Optional)</label>
             <input 
               type="text"
               className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
               value={formData.room}
               onChange={(e) => setFormData({ ...formData, room: e.target.value })}
               placeholder="e.g. Room 101"
             />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Start Time</label>
            <input 
              type="time"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">End Time</label>
            <input 
              type="time"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Assign</Button>
        </div>
      </form>
    </Modal>
  );
};

const ClassExamsTab: React.FC<{ exams: any[] }> = ({ exams }) => {
  const navigate = useNavigate();
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <h3 className="text-lg font-bold text-gray-900">Class Exams</h3>
        <Button size="sm" onClick={() => navigate('/exams')}>
          <Plus size={18} className="mr-2" /> Create Exam
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Exam Name</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Term</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{exam.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exam.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <Badge variant="info">{exam.term.replace('_', ' ')}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(exam.examDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button size="sm" variant="secondary" onClick={() => navigate('/exams')}>View Marks</Button>
                </td>
              </tr>
            ))}
             {exams.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                  No exams recorded for this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const AttendanceTab: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card className="p-8 text-center max-w-2xl mx-auto mt-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-4 rounded-full bg-blue-100 text-blue-600">
          <CalendarCheck size={48} />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Class Attendance</h3>
        <p className="text-gray-500">
          Mark and track attendance for all students in this class. 
          View daily attendance logs and monthly summaries.
        </p>
        <Button onClick={() => navigate('/attendance')} className="mt-4">
          Open Attendance Management
        </Button>
      </div>
    </Card>
  );
};

export default ClassDetailPage;
