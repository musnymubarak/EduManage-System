import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Search, Edit, Award, FileText } from 'lucide-react';
import api from '../services/api';
import { Exam, Class, Student } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';

const ExamsPage: React.FC = () => {
  const [termFilter, setTermFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isMarksEntryModalOpen, setIsMarksEntryModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch exams
  const { data: examsData, isLoading } = useQuery({
    queryKey: ['exams', termFilter, classFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (termFilter) params.append('term', termFilter);
      if (classFilter) params.append('classId', classFilter);
      
      const response = await api.get(`/exams?${params}`);
      return response.data;
    },
  });

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });

  const exams: Exam[] = examsData?.data || [];
  const classes: Class[] = classesData?.data || [];

  const handleEnterMarks = (exam: Exam) => {
    setSelectedExam(exam);
    setIsMarksEntryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
          <Button onClick={() => setIsAddExamModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Create Exam
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Terms</option>
              <option value="FIRST_TERM">First Term</option>
              <option value="SECOND_TERM">Second Term</option>
              <option value="THIRD_TERM">Third Term</option>
            </select>
          </div>
          <div className="flex-1">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Exams Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No exams found. Click "Create Exam" to add a new exam.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Exam Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Term</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Marks</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Exam Fee</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{exam.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{exam.term.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exam.classId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exam.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(exam.examDate)}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                      {exam.totalMarks}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {exam.examFee ? formatCurrency(exam.examFee) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEnterMarks(exam)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="Enter Marks"
                        >
                          <Award size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => {/* TODO: Generate report */}}
                          className="rounded p-1 hover:bg-gray-100"
                          title="Generate Report"
                        >
                          <FileText size={18} className="text-green-600" />
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

      {/* Add Exam Modal */}
      <AddExamModal
        isOpen={isAddExamModalOpen}
        onClose={() => setIsAddExamModalOpen(false)}
        classes={classes}
      />

      {/* Marks Entry Modal */}
      {selectedExam && (
        <MarksEntryModal
          isOpen={isMarksEntryModalOpen}
          onClose={() => {
            setIsMarksEntryModalOpen(false);
            setSelectedExam(null);
          }}
          exam={selectedExam}
        />
      )}
    </div>
  );
};

// Add Exam Modal Component
interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
}

const AddExamModal: React.FC<AddExamModalProps> = ({ isOpen, onClose, classes }) => {
  const [formData, setFormData] = useState({
    name: '',
    term: '',
    classId: '',
    subject: '',
    examDate: '',
    totalMarks: '',
    passingMarks: '',
    examFee: '',
  });

  const queryClient = useQueryClient();

  const addExamMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/exams', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Exam created successfully!');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      onClose();
      setFormData({
        name: '',
        term: '',
        classId: '',
        subject: '',
        examDate: '',
        totalMarks: '',
        passingMarks: '',
        examFee: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create exam');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      totalMarks: parseInt(formData.totalMarks),
      passingMarks: parseInt(formData.passingMarks),
      examFee: formData.examFee ? parseFloat(formData.examFee) : undefined,
    };

    addExamMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Exam"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addExamMutation.isPending}>
            {addExamMutation.isPending ? 'Creating...' : 'Create Exam'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Exam Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Mid Year Exam, Final Exam"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Term"
            name="term"
            value={formData.term}
            onChange={handleChange}
            options={[
              { value: 'FIRST_TERM', label: 'First Term' },
              { value: 'SECOND_TERM', label: 'Second Term' },
              { value: 'THIRD_TERM', label: 'Third Term' },
            ]}
            required
          />

          <Select
            label="Class"
            name="classId"
            value={formData.classId}
            onChange={handleChange}
            options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
            required
          />
        </div>

        <Input
          label="Subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="e.g. Mathematics, Arabic, Quran"
          required
        />

        <Input
          label="Exam Date"
          name="examDate"
          type="date"
          value={formData.examDate}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Total Marks"
            name="totalMarks"
            type="number"
            value={formData.totalMarks}
            onChange={handleChange}
            required
          />

          <Input
            label="Passing Marks"
            name="passingMarks"
            type="number"
            value={formData.passingMarks}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Exam Fee (LKR) - Optional"
          name="examFee"
          type="number"
          step="0.01"
          value={formData.examFee}
          onChange={handleChange}
        />
      </form>
    </Modal>
  );
};

// Marks Entry Modal Component
interface MarksEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
}

const MarksEntryModal: React.FC<MarksEntryModalProps> = ({ isOpen, onClose, exam }) => {
  const [marksData, setMarksData] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Fetch students in the class
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', exam.classId],
    queryFn: async () => {
      const response = await api.get(`/students?classId=${exam.classId}`);
      return response.data;
    },
    enabled: isOpen,
  });

  // Fetch existing marks
  const { data: existingMarksData } = useQuery({
    queryKey: ['examMarks', exam.id],
    queryFn: async () => {
      const response = await api.get(`/exams/${exam.id}/marks`);
      return response.data;
    },
    enabled: isOpen,
  });

  const students: Student[] = studentsData?.data || [];

  // Initialize marks data from existing marks
  React.useEffect(() => {
    if (existingMarksData?.data) {
      const data: Record<string, string> = {};
      existingMarksData.data.forEach((mark: any) => {
        data[mark.studentId] = mark.marksObtained.toString();
      });
      setMarksData(data);
    }
  }, [existingMarksData]);

  const saveMarksMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/exams/${exam.id}/marks`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Marks saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['examMarks'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save marks');
    },
  });

  const handleMarksChange = (studentId: string, marks: string) => {
    setMarksData({ ...marksData, [studentId]: marks });
  };

  const handleSubmit = () => {
    const marks = Object.entries(marksData)
      .filter(([_, mark]) => mark !== '')
      .map(([studentId, mark]) => ({
        studentId,
        marksObtained: parseInt(mark),
      }));

    if (marks.length === 0) {
      toast.error('Please enter marks for at least one student');
      return;
    }

    saveMarksMutation.mutate({ marks });
  };

  const calculateGrade = (marks: number): string => {
    const percentage = (marks / exam.totalMarks) * 100;
    if (percentage >= 75) return 'A';
    if (percentage >= 65) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= exam.passingMarks) return 'S';
    return 'F';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enter Marks - ${exam.name}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saveMarksMutation.isPending}>
            {saveMarksMutation.isPending ? 'Saving...' : 'Save Marks'}
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-lg bg-blue-50 p-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-900">Subject:</span>{' '}
            <span className="text-blue-700">{exam.subject}</span>
          </div>
          <div>
            <span className="font-medium text-blue-900">Total Marks:</span>{' '}
            <span className="text-blue-700">{exam.totalMarks}</span>
          </div>
          <div>
            <span className="font-medium text-blue-900">Passing Marks:</span>{' '}
            <span className="text-blue-700">{exam.passingMarks}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No students found in this class</div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Admission No.
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Student Name
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Marks Obtained
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => {
                const marks = parseInt(marksData[student.id] || '0');
                const grade = marks > 0 ? calculateGrade(marks) : '-';
                const isPassing = marks >= exam.passingMarks;

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.admissionNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.fullName}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max={exam.totalMarks}
                        value={marksData[student.id] || ''}
                        onChange={(e) => handleMarksChange(student.id, e.target.value)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {marks > 0 && (
                        <Badge variant={isPassing ? 'success' : 'danger'}>{grade}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

export default ExamsPage;
