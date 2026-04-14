import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Class, Student, Teacher } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { formatDate } from '../utils/helpers';

const AttendancePage: React.FC = () => {
  const [attendanceType, setAttendanceType] = useState<'STUDENT' | 'TEACHER' | 'STAFF'>('STUDENT');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });

  const classes: Class[] = classesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
          <div className="flex gap-3">
            <Button
              variant={attendanceType === 'STUDENT' ? 'primary' : 'secondary'}
              onClick={() => setAttendanceType('STUDENT')}
            >
              <Users size={20} className="mr-2" />
              Student
            </Button>
            <Button
              variant={attendanceType === 'TEACHER' ? 'primary' : 'secondary'}
              onClick={() => setAttendanceType('TEACHER')}
            >
              <Users size={20} className="mr-2" />
              Teacher
            </Button>
            <Button
              variant={attendanceType === 'STAFF' ? 'primary' : 'secondary'}
              onClick={() => setAttendanceType('STAFF')}
            >
              <Clock size={20} className="mr-2" />
              Staff
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {attendanceType === 'STUDENT' && (
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Attendance Marking */}
      {attendanceType === 'STUDENT' ? (
        <StudentAttendanceMarking
          selectedDate={selectedDate}
          selectedClassId={selectedClassId}
        />
      ) : attendanceType === 'TEACHER' ? (
        <TeacherAttendanceMarking selectedDate={selectedDate} />
      ) : (
        <StaffAttendanceMarking selectedDate={selectedDate} />
      )}
    </div>
  );
};

// Student Attendance Marking Component
interface StudentAttendanceMarkingProps {
  selectedDate: string;
  selectedClassId: string;
}

const StudentAttendanceMarking: React.FC<StudentAttendanceMarkingProps> = ({
  selectedDate,
  selectedClassId,
}) => {
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return { data: [] };
      const response = await api.get(`/students?classId=${selectedClassId}`);
      return response.data;
    },
    enabled: !!selectedClassId,
  });

  const students: Student[] = studentsData?.data || [];

  // Fetch attendance for the date
  const { data: savedAttendanceData } = useQuery({
    queryKey: ['studentAttendance', selectedDate, selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return { data: [] };
      const response = await api.get(
        `/attendance/students?date=${selectedDate}&classId=${selectedClassId}`
      );
      return response.data;
    },
    enabled: !!selectedClassId && !!selectedDate,
  });

  // Initialize attendance data when saved data loads
  React.useEffect(() => {
    if (savedAttendanceData?.data) {
      const data: Record<string, string> = {};
      savedAttendanceData.data.forEach((record: any) => {
        data[record.studentId] = record.status;
      });
      setAttendanceData(data);
    }
  }, [savedAttendanceData]);

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/attendance/students', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Attendance marked successfully!');
      queryClient.invalidateQueries({ queryKey: ['studentAttendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to mark attendance');
    },
  });

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceData({ ...attendanceData, [studentId]: status });
  };

  const handleSubmit = () => {
    if (!selectedClassId) {
      toast.error('Please select a class');
      return;
    }

    const attendanceRecords = students
      .filter((student) => attendanceData[student.id])
      .map((student) => ({
        studentId: student.id,
        status: attendanceData[student.id],
      }));

    if (attendanceRecords.length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    markAttendanceMutation.mutate({
      date: selectedDate,
      classId: selectedClassId,
      attendance: attendanceRecords,
    });
  };

  const markAllPresent = () => {
    const data: Record<string, string> = {};
    students.forEach((student) => {
      data[student.id] = 'PRESENT';
    });
    setAttendanceData(data);
  };

  if (!selectedClassId) {
    return (
      <Card>
        <div className="py-8 text-center text-gray-500">
          Please select a class to mark attendance
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No students found in this class</div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Mark Attendance - {formatDate(selectedDate)}
            </h3>
            <Button variant="secondary" onClick={markAllPresent}>
              Mark All Present
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Admission No.
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Present
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Late
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Sick Leave
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.admissionNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.fullName}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendanceData[student.id] === 'PRESENT'}
                        onChange={() => handleStatusChange(student.id, 'PRESENT')}
                        className="h-4 w-4 text-green-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendanceData[student.id] === 'ABSENT'}
                        onChange={() => handleStatusChange(student.id, 'ABSENT')}
                        className="h-4 w-4 text-red-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendanceData[student.id] === 'LATE'}
                        onChange={() => handleStatusChange(student.id, 'LATE')}
                        className="h-4 w-4 text-yellow-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${student.id}`}
                        checked={attendanceData[student.id] === 'SICK_LEAVE'}
                        onChange={() => handleStatusChange(student.id, 'SICK_LEAVE')}
                        className="h-4 w-4 text-blue-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={markAttendanceMutation.isPending}>
              {markAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

// Teacher Attendance Marking Component
interface TeacherAttendanceMarkingProps {
  selectedDate: string;
}

const TeacherAttendanceMarking: React.FC<TeacherAttendanceMarkingProps> = ({ selectedDate }) => {
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch teachers
  const { data: teachersData, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get('/teachers');
      return response.data;
    },
  });

  const teachers: Teacher[] = teachersData?.data || [];

  // Fetch attendance for the date
  const { data: savedAttendanceData } = useQuery({
    queryKey: ['teacherAttendance', selectedDate],
    queryFn: async () => {
      const response = await api.get(`/attendance/teachers?date=${selectedDate}`);
      return response.data;
    },
    enabled: !!selectedDate,
  });

  // Initialize attendance data
  React.useEffect(() => {
    if (savedAttendanceData?.data) {
      const data: Record<string, string> = {};
      savedAttendanceData.data.forEach((record: any) => {
        data[record.teacherId] = record.status;
      });
      setAttendanceData(data);
    }
  }, [savedAttendanceData]);

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/attendance/teachers', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Attendance marked successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacherAttendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to mark attendance');
    },
  });

  const handleStatusChange = (teacherId: string, status: string) => {
    setAttendanceData({ ...attendanceData, [teacherId]: status });
  };

  const handleSubmit = () => {
    const attendanceRecords = teachers
      .filter((teacher) => attendanceData[teacher.id])
      .map((teacher) => ({
        teacherId: teacher.id,
        status: attendanceData[teacher.id],
      }));

    if (attendanceRecords.length === 0) {
      toast.error('Please mark attendance for at least one teacher');
      return;
    }

    markAttendanceMutation.mutate({
      date: selectedDate,
      attendance: attendanceRecords,
    });
  };

  const markAllPresent = () => {
    const data: Record<string, string> = {};
    teachers.forEach((teacher) => {
      data[teacher.id] = 'PRESENT';
    });
    setAttendanceData(data);
  };

  return (
    <Card>
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading teachers...</div>
      ) : teachers.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No teachers found</div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Mark Attendance - {formatDate(selectedDate)}
            </h3>
            <Button variant="secondary" onClick={markAllPresent}>
              Mark All Present
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Employee ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Teacher Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Present
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Late
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Sick Leave
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {teacher.employeeNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{teacher.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.designation}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${teacher.id}`}
                        checked={attendanceData[teacher.id] === 'PRESENT'}
                        onChange={() => handleStatusChange(teacher.id, 'PRESENT')}
                        className="h-4 w-4 text-green-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${teacher.id}`}
                        checked={attendanceData[teacher.id] === 'ABSENT'}
                        onChange={() => handleStatusChange(teacher.id, 'ABSENT')}
                        className="h-4 w-4 text-red-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${teacher.id}`}
                        checked={attendanceData[teacher.id] === 'LATE'}
                        onChange={() => handleStatusChange(teacher.id, 'LATE')}
                        className="h-4 w-4 text-yellow-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`attendance-${teacher.id}`}
                        checked={attendanceData[teacher.id] === 'SICK_LEAVE'}
                        onChange={() => handleStatusChange(teacher.id, 'SICK_LEAVE')}
                        className="h-4 w-4 text-blue-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={markAttendanceMutation.isPending}>
              {markAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

// Staff Attendance Marking Component
interface StaffAttendanceMarkingProps {
  selectedDate: string;
}

const StaffAttendanceMarking: React.FC<StaffAttendanceMarkingProps> = ({ selectedDate }) => {
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch staff
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await api.get('/staff');
      return response.data;
    },
  });

  const staffList = staffData?.data || [];

  // Fetch attendance for the date
  const { data: savedAttendanceData } = useQuery({
    queryKey: ['staffAttendance', selectedDate],
    queryFn: async () => {
      const response = await api.get(`/attendance/staff?date=${selectedDate}`);
      return response.data;
    },
    enabled: !!selectedDate,
  });

  // Initialize attendance data
  React.useEffect(() => {
    if (savedAttendanceData?.data) {
      const data: Record<string, string> = {};
      savedAttendanceData.data.forEach((record: any) => {
        data[record.staffId] = record.status;
      });
      setAttendanceData(data);
    }
  }, [savedAttendanceData]);

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/attendance/staff', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Staff attendance marked successfully!');
      queryClient.invalidateQueries({ queryKey: ['staffAttendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to mark staff attendance');
    },
  });

  const handleStatusChange = (staffId: string, status: string) => {
    setAttendanceData({ ...attendanceData, [staffId]: status });
  };

  const handleSubmit = () => {
    const attendanceRecords = staffList
      .filter((s: any) => attendanceData[s.id])
      .map((s: any) => ({
        staffId: s.id,
        status: attendanceData[s.id],
      }));

    if (attendanceRecords.length === 0) {
      toast.error('Please mark attendance for at least one staff member');
      return;
    }

    markAttendanceMutation.mutate({
      date: selectedDate,
      attendance: attendanceRecords,
    });
  };

  const markAllPresent = () => {
    const data: Record<string, string> = {};
    staffList.forEach((s: any) => {
      data[s.id] = 'PRESENT';
    });
    setAttendanceData(data);
  };

  return (
    <Card>
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Syncing personnel records...</div>
      ) : staffList.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No non-academic staff found in registries.</div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
              Staff Presence - {formatDate(selectedDate)}
            </h3>
            <Button variant="secondary" onClick={markAllPresent} className="font-bold border-none bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white">
              Mark All Present
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">ID / Persona</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Dept & Designation</th>
                  <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Present</th>
                  <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Absent</th>
                  <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Late</th>
                  <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Sick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffList.map((s: any) => (
                  <tr key={s.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-black text-gray-900 uppercase text-xs">{s.fullName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{s.employeeNumber}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-black text-gray-900 uppercase">{s.designation}</p>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{s.department}</p>
                    </td>
                    {['PRESENT', 'ABSENT', 'LATE', 'SICK_LEAVE'].map((status) => (
                      <td key={status} className="px-5 py-4 text-center">
                        <input
                          type="radio"
                          name={`attendance-${s.id}`}
                          checked={attendanceData[s.id] === status}
                          onChange={() => handleStatusChange(s.id, status)}
                          className={`h-5 w-5 ${
                            status === 'PRESENT' ? 'text-green-600' :
                            status === 'ABSENT' ? 'text-red-600' :
                            status === 'LATE' ? 'text-yellow-500' : 'text-blue-500'
                          } border-2 focus:ring-offset-2 transition-all cursor-pointer`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={handleSubmit} disabled={markAttendanceMutation.isPending} className="bg-blue-600 hover:bg-blue-700 font-black px-10 h-12 shadow-xl shadow-blue-100 uppercase tracking-widest text-xs">
              {markAttendanceMutation.isPending ? 'Committing Changes...' : 'Authorize Presence Record'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

export default AttendancePage;
