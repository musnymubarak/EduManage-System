import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  GraduationCap, Users, UserCheck, AlertTriangle, 
  ChevronDown, ChevronUp, RefreshCw, LogOut, Award
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';

interface Student {
  id: string;
  admissionNumber: string;
  fullName: string;
  classId: string;
}

interface TargetClass {
  id: string;
  name: string;
}

interface ClassGroup {
  classId: string;
  className: string;
  grade: number;
  section: string;
  academicYear: string;
  students: Student[];
  studentCount: number;
  defaultNextClass: TargetClass | null;
  availableTargetClasses: TargetClass[];
}

interface MigrationDecision {
  action: 'PROMOTE' | 'RETAIN' | 'LEAVE';
  targetClassId?: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

const MigrationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [decisions, setDecisions] = useState<Record<string, MigrationDecision>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedTargetYear, setSelectedTargetYear] = useState<string>('');

  // Fetch Academic Years
  const { data: academicYears = [] } = useQuery<AcademicYear[]>({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get('/academic-years');
      return response.data.data;
    }
  });

  // 1. Fetch Migration Preview Data
  const { data: previewData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['migration-preview'],
    queryFn: async () => {
      const response = await api.get('/students/migration/preview');
      return response.data.data;
    }
  });

  const classes: ClassGroup[] = previewData?.classes || [];
  const totalStudentsCount: number = previewData?.totalStudents || 0;

  const filteredGroups = selectedClassFilter === 'all'
    ? classes
    : classes.filter(g => g.classId === selectedClassFilter);

  const activeStudentsCount = selectedClassFilter === 'all'
    ? totalStudentsCount
    : filteredGroups.reduce((acc, g) => acc + g.studentCount, 0);

  const visibleGroups = selectedClassFilter === 'all'
    ? filteredGroups.filter(g => g.studentCount > 0)
    : filteredGroups;

  // 2. Initialize Decisions when data loads
  useEffect(() => {
    if (classes.length > 0) {
      const initialDecisions: Record<string, MigrationDecision> = {};
      const initialExpanded: Record<string, boolean> = {};

      classes.forEach(group => {
        // Expand the first two classes by default
        initialExpanded[group.classId] = true;

        group.students.forEach(student => {
          if (group.defaultNextClass) {
            initialDecisions[student.id] = {
              action: 'PROMOTE',
              targetClassId: group.defaultNextClass.id
            };
          } else {
            // No default next class (e.g. A/L 3rd Year) -> Defaults to graduating (LEAVE)
            initialDecisions[student.id] = {
              action: 'LEAVE'
            };
          }
        });
      });
      setDecisions(initialDecisions);
      setExpandedClasses(initialExpanded);
    }
  }, [previewData]);

  // 3. Handlers for individual student changes
  const handleActionChange = (studentId: string, action: 'PROMOTE' | 'RETAIN' | 'LEAVE', defaultClassId?: string) => {
    setDecisions(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        action,
        targetClassId: action === 'PROMOTE' ? (prev[studentId]?.targetClassId || defaultClassId) : undefined
      }
    }));
  };

  const handleTargetClassChange = (studentId: string, targetClassId: string) => {
    setDecisions(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        targetClassId
      }
    }));
  };

  // 4. Handlers for Class-level bulk changes
  const handleBulkClassAction = (group: ClassGroup, action: 'PROMOTE' | 'RETAIN' | 'LEAVE') => {
    setDecisions(prev => {
      const next = { ...prev };
      group.students.forEach(student => {
        next[student.id] = {
          action,
          targetClassId: action === 'PROMOTE' ? (group.defaultNextClass?.id || group.availableTargetClasses[0]?.id) : undefined
        };
      });
      return next;
    });
    toast.success(`Set all students in ${group.className} to "${action}"`);
  };

  const handleClassDefaultTargetChange = (group: ClassGroup, targetClassId: string) => {
    setDecisions(prev => {
      const next = { ...prev };
      group.students.forEach(student => {
        if (next[student.id]?.action === 'PROMOTE') {
          next[student.id].targetClassId = targetClassId;
        }
      });
      return next;
    });
    toast.success(`Updated default promotion target for ${group.className}`);
  };

  // Toggle Collapse
  const toggleClassExpand = (classId: string) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  // 5. Calculate Live Action Summaries (dynamically filtered or total)
  const getSummaryStats = () => {
    let promoteCount = 0;
    let retainCount = 0;
    let leaveCount = 0;

    filteredGroups.forEach(group => {
      group.students.forEach(student => {
        const d = decisions[student.id];
        if (d) {
          if (d.action === 'PROMOTE') promoteCount++;
          if (d.action === 'RETAIN') retainCount++;
          if (d.action === 'LEAVE') leaveCount++;
        }
      });
    });

    return { promoteCount, retainCount, leaveCount };
  };

  const { promoteCount, retainCount, leaveCount } = getSummaryStats();

  // 6. Execute Migration Mutation
  const executeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/students/migration/execute', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Migration executed successfully!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsConfirmModalOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to execute student migration');
    }
  });

  const handleConfirmSubmit = () => {
    if (!selectedTargetYear) {
      toast.error('Please select a target academic year first.');
      return;
    }
    const targetStudents = filteredGroups.flatMap(g => g.students);
    const payload = {
      targetAcademicYear: selectedTargetYear,
      migrations: targetStudents.map(student => {
        const dec = decisions[student.id] || { action: 'RETAIN' };
        return {
          studentId: student.id,
          action: dec.action,
          targetClassId: dec.action === 'PROMOTE' ? dec.targetClassId : undefined
        };
      })
    };

    executeMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-gray-500">Loading student migration list...</p>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12 space-y-4">
            <GraduationCap className="h-16 w-16 mx-auto text-gray-400" />
            <h3 className="text-xl font-bold text-gray-800">No Active Students Available</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              There are no active students in the system that need class promotion at this time.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Page Title Card */}
      <Card className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white border-none shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <GraduationCap size={180} />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-wide flex items-center gap-2.5">
              <GraduationCap size={28} className="text-blue-300 animate-pulse" />
              Annual Student Class Migration
            </h2>
            <p className="text-xs text-blue-100/90 font-medium max-w-2xl leading-relaxed">
              Promote passing students to their next class, retain repeating students, and record graduates or school departures.
            </p>
          </div>
          <button 
            onClick={() => refetch()} 
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 select-none cursor-pointer self-start md:self-auto active:scale-95"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </Card>

      {/* Configuration & Filter Card */}
      <Card className="py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Filter Current Class */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Filter View:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer min-w-[200px]"
              >
                <option value="all">All Classes ({classes.length})</option>
                {classes.map(c => (
                  <option key={c.classId} value={c.classId}>Class {c.className} ({c.studentCount} students)</option>
                ))}
              </select>
            </div>

            {/* Target Academic Year */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                Target Year:
              </span>
              <div className="flex items-center gap-2">
                <select
                  required
                  value={selectedTargetYear}
                  onChange={(e) => setSelectedTargetYear(e.target.value)}
                  className="rounded-xl border-2 border-rose-200 bg-rose-50/15 px-4 py-2.5 text-xs font-black text-rose-700 hover:border-rose-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm transition-all cursor-pointer min-w-[200px]"
                >
                  <option value="">-- Select Target Year --</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.year}>
                      {ay.year} {ay.isCurrent ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
                <Link 
                  to="/academic-years" 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                >
                  Manage Years
                </Link>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider border-l-2 border-slate-100 pl-4">
            {selectedClassFilter === 'all' ? 'Managing All Classes' : `Managing Class ${classes.find(c => c.classId === selectedClassFilter)?.className}`}
          </div>
        </div>
      </Card>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Active</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{activeStudentsCount}</p>
          </div>
          <Users className="h-10 w-10 text-gray-300" />
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">To Promote</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{promoteCount}</p>
          </div>
          <UserCheck className="h-10 w-10 text-emerald-300" />
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">To Retain</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{retainCount}</p>
          </div>
          <RefreshCw className="h-10 w-10 text-amber-300" />
        </div>
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">To Leave / Graduate</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{leaveCount}</p>
          </div>
          <LogOut className="h-10 w-10 text-rose-300" />
        </div>
      </div>

      {/* Main Class accordion list */}
      <div className="space-y-4">
        {visibleGroups.length > 0 ? (
          visibleGroups.map(group => {
            const isExpanded = !!expandedClasses[group.classId];
          const classDecisions = group.students.map(s => decisions[s.id]).filter(Boolean);
          const classPromotes = classDecisions.filter(d => d.action === 'PROMOTE').length;
          const classRetains = classDecisions.filter(d => d.action === 'RETAIN').length;
          const classLeaves = classDecisions.filter(d => d.action === 'LEAVE').length;

          // Get default target class ID (checks if any student is set to promote, otherwise defaults to class level recommendation)
          const firstPromoted = group.students.find(s => decisions[s.id]?.action === 'PROMOTE');
          const activeTargetClassId = firstPromoted ? decisions[firstPromoted.id]?.targetClassId : (group.defaultNextClass?.id || '');

          return (
            <div key={group.classId} className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
              {/* Class Header */}
              <div 
                onClick={() => toggleClassExpand(group.classId)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 select-none border-b border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/60">
                    <GraduationCap size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                      Class {group.className}
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/50">
                        Active
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Grade {group.grade} • {group.students.length} active students • Year {group.academicYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  {/* Badges summarizing class choices */}
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {classPromotes > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg">
                        {classPromotes} promote
                      </span>
                    )}
                    {classRetains > 0 && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg">
                        {classRetains} retain
                      </span>
                    )}
                    {classLeaves > 0 && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg">
                        {classLeaves} leave
                      </span>
                    )}
                  </div>
                  
                  {isExpanded ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
                </div>
              </div>

              {/* Class Body Details (Student list & actions) */}
              {isExpanded && (
                <div className="p-5 space-y-6 bg-gray-50/20">
                  {/* Bulk Configuration header */}
                  <div className="flex flex-col lg:flex-row justify-between gap-4 p-4 bg-gray-50/70 border border-gray-200/50 rounded-2xl text-sm">
                    {/* Class default target */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="font-bold text-gray-700">Promotion Target Class:</span>
                      {group.availableTargetClasses.length > 0 ? (
                        <select
                          value={activeTargetClassId}
                          onChange={(e) => handleClassDefaultTargetChange(group, e.target.value)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-bold text-gray-700 text-xs hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
                        >
                          {group.availableTargetClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                          <Award size={12} />
                          Final Graduation Class
                        </span>
                      )}
                    </div>

                    {/* Bulk set buttons */}
                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">Bulk Set Class:</span>
                      {group.availableTargetClasses.length > 0 && (
                        <button 
                          onClick={() => handleBulkClassAction(group, 'PROMOTE')}
                          className="px-3 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-50/50 text-emerald-700 rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          Promote All
                        </button>
                      )}
                      <button 
                        onClick={() => handleBulkClassAction(group, 'RETAIN')}
                        className="px-3 py-1.5 bg-white border border-amber-200 hover:bg-amber-50/50 text-amber-700 rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        Retain All
                      </button>
                      <button 
                        onClick={() => handleBulkClassAction(group, 'LEAVE')}
                        className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50/50 text-rose-700 rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        {group.availableTargetClasses.length === 0 ? 'Graduate All' : 'Leave All'}
                      </button>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/80">
                          <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Admission No</th>
                          <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Student Name</th>
                          <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-center">Migration Choice</th>
                          <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Destination Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.students.map(student => {
                          const decision = decisions[student.id] || { action: 'RETAIN' };
                          
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-5 py-4 text-sm font-bold text-gray-600">
                                {student.admissionNumber}
                              </td>
                              <td className="px-5 py-4 text-sm font-black text-gray-900">
                                {student.fullName}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <div className="inline-flex rounded-xl bg-gray-50 p-1 border border-gray-200/60 shadow-inner">
                                  {/* Promote Option */}
                                  {group.availableTargetClasses.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleActionChange(student.id, 'PROMOTE', group.defaultNextClass?.id)}
                                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
                                        decision.action === 'PROMOTE'
                                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                                          : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                                      }`}
                                    >
                                      Promote
                                    </button>
                                  )}
                                  
                                  {/* Retain Option */}
                                  <button
                                    type="button"
                                    onClick={() => handleActionChange(student.id, 'RETAIN')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
                                      decision.action === 'RETAIN'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                                    }`}
                                  >
                                    Retain
                                  </button>
                                  
                                  {/* Leave Option */}
                                  <button
                                    type="button"
                                    onClick={() => handleActionChange(student.id, 'LEAVE')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 ${
                                      decision.action === 'LEAVE'
                                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                                    }`}
                                  >
                                    {group.availableTargetClasses.length === 0 ? 'Graduate' : 'Leave'}
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm">
                                {decision.action === 'PROMOTE' && group.availableTargetClasses.length > 0 ? (
                                  <select
                                    value={decision.targetClassId || ''}
                                    onChange={(e) => handleTargetClassChange(student.id, e.target.value)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-bold text-gray-700 text-xs hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
                                  >
                                    {group.availableTargetClasses.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                ) : decision.action === 'RETAIN' ? (
                                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg inline-flex items-center gap-1.5">
                                    Same Class ({group.className})
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-lg inline-flex items-center gap-1.5">
                                    {group.availableTargetClasses.length === 0 ? 'Graduated' : 'Left Institution'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
        ) : (
          <Card>
            <div className="text-center py-12 space-y-4">
              <GraduationCap className="h-16 w-16 mx-auto text-gray-400" />
              <h3 className="text-xl font-bold text-gray-800">No Active Students</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                There are no active students in this class that need class promotion at this time.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 border-t border-gray-200/80 px-6 py-4 flex items-center justify-between shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/80 z-20 transition-all duration-300">
        <div className="min-w-0">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Migration Summary</p>
          <div className="flex items-center gap-3 mt-0.5 text-sm font-bold text-gray-700">
            <span className="text-emerald-600">{promoteCount} Promote</span>
            <span className="text-gray-300">•</span>
            <span className="text-amber-600">{retainCount} Retain</span>
            <span className="text-gray-300">•</span>
            <span className="text-rose-600">{leaveCount} Leave/Graduate</span>
          </div>
        </div>

        <Button 
          type="button"
          onClick={() => {
            if (!selectedTargetYear) {
              toast.error('Please select a target academic year first.');
              return;
            }
            setIsConfirmModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200"
          disabled={activeStudentsCount === 0 || executeMutation.isPending}
        >
          {executeMutation.isPending ? 'Processing...' : 'Review & Migrate →'}
        </Button>
      </div>

      {/* Confirm Execution Modal */}
      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)} 
        title="Confirm Annual Student Class Migration"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-900">Important Warning</p>
              <p className="text-amber-700 mt-1 leading-relaxed">
                This will migrate all selected student cohorts into the new academic year: <strong className="text-rose-600 underline font-black">{selectedTargetYear}</strong>. All system classes will be advanced to this year. This action is permanent.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">Migration Counts Summary</label>
            <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
              <div className="p-4 flex items-center justify-between text-sm bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="font-bold text-gray-700">Students to Promote</span>
                </div>
                <span className="font-black text-emerald-600 text-base">{promoteCount}</span>
              </div>
              <div className="p-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-bold text-gray-700">Students to Retain (Repeat)</span>
                </div>
                <span className="font-black text-amber-500 text-base">{retainCount}</span>
              </div>
              <div className="p-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="font-bold text-gray-700">Students Graduating / Leaving</span>
                </div>
                <span className="font-black text-rose-500 text-base">{leaveCount}</span>
              </div>
              <div className="p-4 flex items-center justify-between text-sm bg-blue-50/30">
                <span className="font-bold text-blue-900">Total Migrated Records</span>
                <span className="font-black text-blue-700 text-base">{promoteCount + retainCount + leaveCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsConfirmModalOpen(false)} 
              className="flex-1 font-bold h-12 rounded-xl"
              disabled={executeMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSubmit}
              disabled={executeMutation.isPending}
              className="flex-[2] bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-200"
            >
              {executeMutation.isPending ? 'Migrating Students...' : 'Execute Migration Now'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MigrationPage;
