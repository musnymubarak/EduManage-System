import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Award, FileText, Trash2, Edit, ChevronRight, ArrowLeft, Calendar, History, GraduationCap, Download, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { Exam, Class, Student } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate, formatCurrency } from '../utils/helpers';
import { ActionMenu } from '../components/UI/ActionMenu';
import { generateSubjectReport, generateClassTermReport, generateBulkReportCards } from '../utils/generateReportCards';

interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface ClassGroup {
  label: string;
  grade: number;
  classes: Class[];
  hasSections: boolean;
}

type ViewMode = 'active' | 'past';
type Step = 'terms' | 'classes' | 'exams';

const TERM_CONFIG = [
  { value: 'FIRST_TERM', label: 'First Term', description: 'Term 1 Examinations', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
  { value: 'SECOND_TERM', label: 'Second Term', description: 'Term 2 Examinations', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { value: 'THIRD_TERM', label: 'Third Term', description: 'Term 3 Examinations', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700' },
];

// Build class groups: classes with same grade + sections become one group
function buildClassGroups(classes: Class[]): ClassGroup[] {
  const gradeMap: Record<string, Class[]> = {};
  classes.forEach((cls) => {
    const key = `${cls.grade}`;
    if (!gradeMap[key]) gradeMap[key] = [];
    gradeMap[key].push(cls);
  });

  const groups: ClassGroup[] = [];
  Object.entries(gradeMap).forEach(([, clsList]) => {
    const withSections = clsList.filter((c) => c.section);
    const withoutSections = clsList.filter((c) => !c.section);

    // Classes with sections form one group (e.g., 9A + 9B -> "Grade 9")
    if (withSections.length > 1) {
      groups.push({
        label: `Grade ${withSections[0].grade}`,
        grade: withSections[0].grade,
        classes: withSections,
        hasSections: true,
      });
    } else if (withSections.length === 1) {
      // Single class with section — still show as itself
      groups.push({
        label: withSections[0].name,
        grade: withSections[0].grade,
        classes: withSections,
        hasSections: false,
      });
    }

    // Classes without sections are standalone (A/L 1st Year, Final, etc.)
    withoutSections.forEach((cls) => {
      groups.push({
        label: cls.name,
        grade: cls.grade,
        classes: [cls],
        hasSections: false,
      });
    });
  });

  return groups.sort((a, b) => a.grade - b.grade);
}

const ExamsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isMarksEntryModalOpen, setIsMarksEntryModalOpen] = useState(false);
  const [isEditExamModalOpen, setIsEditExamModalOpen] = useState(false);

  // Derive navigation state from URL search params
  const viewMode: ViewMode = (searchParams.get('view') as ViewMode) || 'active';
  const step: Step = (searchParams.get('step') as Step) || 'terms';
  const selectedTerm = searchParams.get('term') || '';
  const selectedGroupIndex = searchParams.has('group') ? parseInt(searchParams.get('group')!) : -1;
  const selectedAcademicYear = searchParams.get('year') || '';

  // Helper to update search params (pushes to history so browser back works)
  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === '') next.delete(key);
        else next.set(key, val);
      });
      return next;
    });
  }, [setSearchParams]);

  const queryClient = useQueryClient();

  // Fetch academic years
  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get('/academic-years');
      return response.data;
    },
  });

  const academicYears: AcademicYear[] = academicYearsData?.data || [];
  const activeYear = academicYears.find((ay) => ay.isCurrent);

  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYear) {
      const active = academicYears.find((ay) => ay.isCurrent);
      if (active) updateParams({ year: active.year });
    }
  }, [academicYears]);

  const effectiveYear = viewMode === 'active' ? (activeYear?.year || '') : selectedAcademicYear;

  // Fetch classes for the selected academic year
  const { data: classesData } = useQuery({
    queryKey: ['classes', effectiveYear],
    queryFn: async () => {
      const params = effectiveYear ? `?academicYear=${effectiveYear}` : '';
      const response = await api.get(`/classes${params}`);
      return response.data;
    },
    enabled: !!effectiveYear,
  });

  const classes: Class[] = classesData?.data || [];
  const classGroups = useMemo(() => buildClassGroups(classes), [classes]);
  const selectedGroup = selectedGroupIndex >= 0 ? classGroups[selectedGroupIndex] : null;
  const selectedClassIds = selectedGroup ? selectedGroup.classes.map((c) => c.id) : [];

  // Fetch exams for all classes in the selected group
  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['exams', effectiveYear, selectedTerm, selectedClassIds.join(',')],
    queryFn: async () => {
      // Fetch exams for each class in the group
      const promises = selectedClassIds.map((classId) => {
        const params = new URLSearchParams();
        if (effectiveYear) params.append('academicYear', effectiveYear);
        if (selectedTerm) params.append('term', selectedTerm);
        params.append('classId', classId);
        return api.get(`/exams?${params}`);
      });
      const results = await Promise.all(promises);
      const allExams = results.flatMap((r) => r.data.data || []);
      return { data: allExams };
    },
    enabled: step === 'exams' && !!selectedTerm && selectedClassIds.length > 0,
  });

  // Fetch exam counts per term
  const { data: allExamsForYear } = useQuery({
    queryKey: ['exams-count', effectiveYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveYear) params.append('academicYear', effectiveYear);
      params.append('limit', '500');
      const response = await api.get(`/exams?${params}`);
      return response.data;
    },
    enabled: !!effectiveYear,
  });

  const allExams: Exam[] = allExamsForYear?.data || [];
  const exams: Exam[] = examsData?.data || [];
  const selectedTermConfig = TERM_CONFIG.find((t) => t.value === selectedTerm);

  // For grouped grades, deduplicate exams by name+subject (show one row per exam, not per class)
  const deduplicatedExams = useMemo(() => {
    if (!selectedGroup?.hasSections) return exams.map((e) => ({ exam: e, classExams: [e] }));

    const grouped: Record<string, Exam[]> = {};
    exams.forEach((e) => {
      const key = `${e.name}__${e.subject}__${e.examDate}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    return Object.values(grouped).map((group) => ({
      exam: group[0], // representative exam
      classExams: group, // all class-specific exams
    }));
  }, [exams, selectedGroup]);

  const getTermExamCount = (term: string) => {
    // Count unique exams (deduplicate by name+subject+date for grouped classes)
    const termExams = allExams.filter((e) => e.term === term);
    const seen = new Set<string>();
    let count = 0;
    termExams.forEach((e) => {
      const key = `${e.name}__${e.subject}__${e.examDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    });
    return count;
  };

  const getGroupExamCount = (group: ClassGroup, term: string) => {
    const groupClassIds = new Set(group.classes.map((c) => c.id));
    const groupExams = allExams.filter((e) => e.term === term && groupClassIds.has(e.classId));
    // Deduplicate for multi-section groups
    const seen = new Set<string>();
    let count = 0;
    groupExams.forEach((e) => {
      const key = `${e.name}__${e.subject}__${e.examDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    });
    return count;
  };

  const deleteMutation = useMutation({
    mutationFn: async (examGroup: Exam[]) => {
      // Delete all class-specific versions of this exam
      await Promise.all(examGroup.map((e) => api.delete(`/exams/${e.id}`)));
    },
    onSuccess: () => {
      toast.success('Exam deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete exam');
    },
  });

  const handleSelectTerm = (term: string) => {
    updateParams({ step: 'classes', term, group: undefined });
  };

  const handleSelectGroup = (index: number) => {
    updateParams({ step: 'exams', group: index.toString() });
  };

  const handleBack = () => {
    if (step === 'exams') {
      updateParams({ step: 'classes', group: undefined });
    } else if (step === 'classes') {
      updateParams({ step: undefined, term: undefined, group: undefined });
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    const params: Record<string, string | undefined> = {
      view: mode === 'active' ? undefined : mode,
      step: undefined,
      term: undefined,
      group: undefined,
    };
    if (mode === 'active' && activeYear) {
      params.year = activeYear.year;
    }
    updateParams(params);
  };

  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setIsEditExamModalOpen(true);
  };

  const handleEnterMarks = (exam: Exam) => {
    setSelectedExam(exam);
    setIsMarksEntryModalOpen(true);
  };

  const handleDeleteExam = (classExams: Exam[]) => {
    const examName = classExams[0].name;
    const msg = classExams.length > 1
      ? `Are you sure you want to delete "${examName}" from all ${classExams.length} classes? All marks will be deleted too.`
      : `Are you sure you want to delete "${examName}"? All marks will be deleted too.`;
    if (window.confirm(msg)) {
      deleteMutation.mutate(classExams);
    }
  };

  const [isReportGenerating, setIsReportGenerating] = useState(false);

  const handleSubjectReport = async (examId: string) => {
    setIsReportGenerating(true);
    try {
      const result = await generateSubjectReport(examId);
      window.open(result.blobUrl, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setIsReportGenerating(false);
    }
  };

  const handleClassTermReport = async (classId: string) => {
    if (!selectedTerm || !effectiveYear) return;
    setIsReportGenerating(true);
    try {
      const result = await generateClassTermReport(classId, selectedTerm, effectiveYear);
      window.open(result.blobUrl, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setIsReportGenerating(false);
    }
  };

  const handleBulkReportCards = async (classId: string) => {
    if (!selectedTerm || !effectiveYear) return;
    setIsReportGenerating(true);
    try {
      const result = await generateBulkReportCards(classId, selectedTerm, effectiveYear);
      window.open(result.blobUrl, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report cards');
    } finally {
      setIsReportGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
            {effectiveYear && (
              <p className="mt-1 text-sm text-gray-500">
                Academic Year: <span className="font-semibold text-gray-700">{effectiveYear}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => handleViewModeChange('active')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'active'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar size={15} />
                Active Year
              </button>
              <button
                onClick={() => handleViewModeChange('past')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'past'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <History size={15} />
                Past Records
              </button>
            </div>
            {step === 'exams' && selectedGroup && (
              <div className="flex items-center gap-2">
                <ReportsDropdown
                  group={selectedGroup}
                  isGenerating={isReportGenerating}
                  onClassTermReport={handleClassTermReport}
                  onBulkReportCards={handleBulkReportCards}
                />
                {viewMode === 'active' && (
                  <Button onClick={() => setIsAddExamModalOpen(true)}>
                    <Plus size={20} className="mr-2" />
                    Create Exam
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Past Year Selector */}
      {viewMode === 'past' && (
        <Card>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Academic Year:</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                updateParams({ year: e.target.value || undefined, step: undefined, term: undefined, group: undefined });
              }}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a year...</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.year}>
                  {ay.year} {ay.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Breadcrumb Navigation */}
      {step !== 'terms' && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => updateParams({ step: undefined, term: undefined, group: undefined })}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Terms
          </button>
          {selectedTerm && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <button
                onClick={() => updateParams({ step: 'classes', group: undefined })}
                className={`font-medium ${step === 'classes' ? 'text-gray-700' : 'text-blue-600 hover:text-blue-800'}`}
              >
                {selectedTermConfig?.label}
              </button>
            </>
          )}
          {selectedGroup && step === 'exams' && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="font-medium text-gray-700">{selectedGroup.label}</span>
            </>
          )}
        </div>
      )}

      {/* Step 1: Term Selection */}
      {step === 'terms' && effectiveYear && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TERM_CONFIG.map((term) => {
            const count = getTermExamCount(term.value);
            return (
              <button
                key={term.value}
                onClick={() => handleSelectTerm(term.value)}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-gray-300 active:scale-[0.98]"
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${term.color}`} />
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700">{term.label}</h3>
                    <p className="mt-1 text-sm text-gray-500">{term.description}</p>
                  </div>
                  <div className={`rounded-full ${term.bg} p-2`}>
                    <BookOpen size={20} className={term.text} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full ${term.bg} px-2.5 py-0.5 text-xs font-medium ${term.text}`}>
                    {count} {count === 1 ? 'exam' : 'exams'}
                  </span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No academic year */}
      {!effectiveYear && (
        <Card>
          <div className="py-12 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {viewMode === 'past'
                ? 'Please select an academic year to view exam records.'
                : 'No active academic year found. Please set one in Academic Year settings.'}
            </p>
          </div>
        </Card>
      )}

      {/* Step 2: Class/Grade Group Selection */}
      {step === 'classes' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
            <h3 className="text-lg font-semibold text-gray-800">Select Class — {selectedTermConfig?.label}</h3>
          </div>
          {classGroups.length === 0 ? (
            <Card><div className="py-8 text-center text-gray-500">No classes found for {effectiveYear}.</div></Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {classGroups.map((group, idx) => {
                const examCount = getGroupExamCount(group, selectedTerm);
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectGroup(idx)}
                    className="group rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-blue-300 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2">
                        <GraduationCap size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">{group.label}</h4>
                        {group.hasSections && (
                          <p className="text-xs text-gray-400">{group.classes.map((c) => c.name).join(', ')}</p>
                        )}
                        <p className="text-xs text-gray-500">{examCount} {examCount === 1 ? 'exam' : 'exams'}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Exams Table */}
      {step === 'exams' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedTermConfig?.label} — {selectedGroup?.label}
            </h3>
          </div>
          <Card>
            {examsLoading ? (
              <div className="py-8 text-center text-gray-500">Loading exams...</div>
            ) : deduplicatedExams.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No exams found for this selection.</p>
                {viewMode === 'active' && (
                  <Button className="mt-4" onClick={() => setIsAddExamModalOpen(true)}>
                    <Plus size={18} className="mr-2" /> Create First Exam
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Exam Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Marks</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Pass Marks</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Exam Fee</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deduplicatedExams.map(({ exam, classExams }) => (
                      <tr key={exam.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{exam.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{exam.subject}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(exam.examDate)}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">{exam.totalMarks}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{exam.passingMarks}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {exam.examFee ? formatCurrency(exam.examFee) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <ActionMenu items={[
                              ...(selectedGroup?.hasSections
                                ? selectedGroup.classes.map((cls) => {
                                    const classExam = classExams.find((ce) => ce.classId === cls.id);
                                    return {
                                      label: `Enter Marks — ${cls.name}`,
                                      icon: <Award size={15} />,
                                      onClick: () => classExam && handleEnterMarks(classExam),
                                    };
                                  })
                                : [{ label: 'Enter Marks', icon: <Award size={15} />, onClick: () => handleEnterMarks(exam) }]
                              ),
                              { label: 'Edit', icon: <Edit size={15} />, onClick: () => handleEditExam(exam) },
                              ...(selectedGroup?.hasSections
                                ? classExams.map((ce) => ({
                                    label: `Subject Report — ${ce.class?.name || ''}`,
                                    icon: <FileText size={15} />,
                                    onClick: () => handleSubjectReport(ce.id),
                                  }))
                                : [{ label: 'Subject Report', icon: <FileText size={15} />, onClick: () => handleSubjectReport(exam.id) }]
                              ),
                              { label: 'Delete', icon: <Trash2 size={15} />, onClick: () => handleDeleteExam(classExams), variant: 'danger' as const },
                            ]} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Exam Modal */}
      <AddExamModal
        isOpen={isAddExamModalOpen}
        onClose={() => setIsAddExamModalOpen(false)}
        classGroups={classGroups}
        defaultTerm={selectedTerm}
        defaultGroupIndex={selectedGroupIndex}
      />

      {/* Edit Exam Modal */}
      {selectedExam && isEditExamModalOpen && (
        <EditExamModal
          isOpen={isEditExamModalOpen}
          onClose={() => { setIsEditExamModalOpen(false); setSelectedExam(null); }}
          classGroups={classGroups}
          exam={selectedExam}
        />
      )}

      {/* Marks Entry Modal */}
      {selectedExam && (
        <MarksEntryModal
          isOpen={isMarksEntryModalOpen}
          onClose={() => { setIsMarksEntryModalOpen(false); setSelectedExam(null); }}
          exam={selectedExam}
        />
      )}
    </div>
  );
};

// Edit Exam Modal
interface EditExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroups: ClassGroup[];
  exam: Exam;
}

const EditExamModal: React.FC<EditExamModalProps> = ({ isOpen, onClose, classGroups, exam }) => {
  const [formData, setFormData] = useState({
    name: exam.name,
    term: exam.term,
    classId: exam.classId,
    subject: exam.subject,
    examDate: exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '',
    totalMarks: exam.totalMarks.toString(),
    passingMarks: exam.passingMarks.toString(),
    examFee: exam.examFee !== null && exam.examFee !== undefined ? exam.examFee.toString() : '',
  });

  const queryClient = useQueryClient();

  const editExamMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/exams/${exam.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Exam updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update exam');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editExamMutation.mutate({
      ...formData,
      totalMarks: parseFloat(formData.totalMarks),
      passingMarks: parseFloat(formData.passingMarks),
      examFee: formData.examFee ? parseFloat(formData.examFee) : null,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'classId') {
      setFormData((prev) => ({ ...prev, classId: value, subject: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Flatten all classes for the dropdown
  const allClasses = classGroups.flatMap((g) => g.classes);
  const selectedClass = allClasses.find((c) => c.id === formData.classId);
  const classSubjects = selectedClass?.subjects || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Exam" size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={editExamMutation.isPending}>
            {editExamMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Exam Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mid Year Exam" required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Term" name="term" value={formData.term} onChange={handleChange}
            options={[
              { value: 'FIRST_TERM', label: 'First Term' },
              { value: 'SECOND_TERM', label: 'Second Term' },
              { value: 'THIRD_TERM', label: 'Third Term' },
            ]} required />
          <Select label="Class" name="classId" value={formData.classId} onChange={handleChange}
            options={allClasses.map((cls) => ({ value: cls.id, label: cls.name }))} required />
        </div>
        {classSubjects.length > 0 ? (
          <Select label="Subject" name="subject" value={formData.subject} onChange={handleChange}
            options={classSubjects.map((s) => ({ value: s, label: s }))} required />
        ) : (
          <Input label="Subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="e.g. Mathematics, Arabic" required />
        )}
        <Input label="Exam Date" name="examDate" type="date" value={formData.examDate} onChange={handleChange} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Marks" name="totalMarks" type="number" value={formData.totalMarks} onChange={handleChange} required />
          <Input label="Passing Marks" name="passingMarks" type="number" value={formData.passingMarks} onChange={handleChange} required />
        </div>
        <Input label="Exam Fee (LKR) - Optional" name="examFee" type="number" step="0.01" value={formData.examFee} onChange={handleChange} />
      </form>
    </Modal>
  );
};

// Add Exam Modal
interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroups: ClassGroup[];
  defaultTerm?: string;
  defaultGroupIndex?: number;
}

const AddExamModal: React.FC<AddExamModalProps> = ({ isOpen, onClose, classGroups, defaultTerm = '', defaultGroupIndex = -1 }) => {
  const [formData, setFormData] = useState({
    name: '',
    term: defaultTerm,
    groupIndex: defaultGroupIndex >= 0 ? defaultGroupIndex.toString() : '',
    subject: '',
    examDate: '',
    totalMarks: '',
    passingMarks: '',
    examFee: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        term: defaultTerm || prev.term,
        groupIndex: defaultGroupIndex >= 0 ? defaultGroupIndex.toString() : prev.groupIndex,
      }));
    }
  }, [isOpen, defaultTerm, defaultGroupIndex]);

  const queryClient = useQueryClient();

  const addExamMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/exams', data);
      return response.data;
    },
    onSuccess: () => {
      const group = formData.groupIndex !== '' ? classGroups[parseInt(formData.groupIndex)] : null;
      const msg = group?.hasSections
        ? `Exam created for ${group.classes.map((c) => c.name).join(', ')}!`
        : 'Exam created successfully!';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      onClose();
      setFormData({
        name: '', term: defaultTerm, groupIndex: defaultGroupIndex >= 0 ? defaultGroupIndex.toString() : '',
        subject: '', examDate: '', totalMarks: '', passingMarks: '', examFee: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create exam');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.groupIndex === '') {
      toast.error('Please select a class');
      return;
    }

    const group = classGroups[parseInt(formData.groupIndex)];
    // Send classId of the first class — backend will auto-create for siblings
    const submitData = {
      name: formData.name,
      term: formData.term,
      classId: group.classes[0].id,
      subject: formData.subject,
      examDate: formData.examDate,
      totalMarks: parseInt(formData.totalMarks),
      passingMarks: parseInt(formData.passingMarks),
      examFee: formData.examFee ? parseFloat(formData.examFee) : undefined,
    };

    addExamMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'groupIndex') {
      setFormData((prev) => ({ ...prev, groupIndex: value, subject: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const selectedGroup = formData.groupIndex !== '' ? classGroups[parseInt(formData.groupIndex)] : null;
  const groupClasses = selectedGroup?.classes || [];
  const groupSubjects = Array.from(new Set(groupClasses.flatMap((c) => c.subjects || [])));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Exam" size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={addExamMutation.isPending}>
            {addExamMutation.isPending ? 'Creating...' : 'Create Exam'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Exam Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mid Year Exam, Final Exam" required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Term" name="term" value={formData.term} onChange={handleChange}
            options={[
              { value: 'FIRST_TERM', label: 'First Term' },
              { value: 'SECOND_TERM', label: 'Second Term' },
              { value: 'THIRD_TERM', label: 'Third Term' },
            ]} required />
          <Select label="Class" name="groupIndex" value={formData.groupIndex} onChange={handleChange}
            options={classGroups.map((g, i) => ({ value: i.toString(), label: g.label }))} required />
        </div>
        {selectedGroup?.hasSections && (
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            This exam will be created for: <strong>{selectedGroup.classes.map((c) => c.name).join(', ')}</strong>
          </div>
        )}
        {groupSubjects.length > 0 ? (
          <Select label="Subject" name="subject" value={formData.subject} onChange={handleChange}
            options={[
              { value: '', label: 'Select Subject' },
              ...groupSubjects.map((s) => ({ value: s, label: s }))
            ]} required />
        ) : (
          <Input label="Subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="e.g. Mathematics, Arabic, Quran" required />
        )}
        <Input label="Exam Date" name="examDate" type="date" value={formData.examDate} onChange={handleChange} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Marks" name="totalMarks" type="number" value={formData.totalMarks} onChange={handleChange} required />
          <Input label="Passing Marks" name="passingMarks" type="number" value={formData.passingMarks} onChange={handleChange} required />
        </div>
        <Input label="Exam Fee (LKR) - Optional" name="examFee" type="number" step="0.01" value={formData.examFee} onChange={handleChange} />
      </form>
    </Modal>
  );
};

// Marks Entry Modal
interface MarksEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
}

const MarksEntryModal: React.FC<MarksEntryModalProps> = ({ isOpen, onClose, exam }) => {
  const [marksData, setMarksData] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch students in the exam's class
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
    const parsed = parseFloat(marks);
    if (!isNaN(parsed) && parsed > exam.totalMarks) {
      toast.error(`Marks cannot exceed the maximum marks of ${exam.totalMarks}`);
      return;
    }
    if (!isNaN(parsed) && parsed < 0) {
      toast.error('Marks cannot be negative');
      return;
    }
    setMarksData({ ...marksData, [studentId]: marks });
  };

  const handleSubmit = () => {
    const invalidMarkEntry = Object.entries(marksData)
      .filter(([_, mark]) => mark !== '')
      .find(([_, mark]) => {
        const val = parseFloat(mark);
        return val > exam.totalMarks || val < 0;
      });
    if (invalidMarkEntry) {
      toast.error(`Marks must be between 0 and ${exam.totalMarks}`);
      return;
    }
    const marks = Object.entries(marksData)
      .filter(([_, mark]) => mark !== '')
      .map(([studentId, mark]) => ({ studentId, marksObtained: parseInt(mark) }));
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
    <Modal isOpen={isOpen} onClose={onClose}
      title={`Enter Marks — ${exam.name}${exam.class ? ` (${exam.class.name})` : ''}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saveMarksMutation.isPending}>
            {saveMarksMutation.isPending ? 'Saving...' : 'Save Marks'}
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-lg bg-blue-50 p-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="font-medium text-blue-900">Subject:</span> <span className="text-blue-700">{exam.subject}</span></div>
          <div><span className="font-medium text-blue-900">Total Marks:</span> <span className="text-blue-700">{exam.totalMarks}</span></div>
          <div><span className="font-medium text-blue-900">Passing Marks:</span> <span className="text-blue-700">{exam.passingMarks}</span></div>
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admission No.</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Marks Obtained</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => {
                const marks = parseInt(marksData[student.id] || '0');
                const grade = marks > 0 ? calculateGrade(marks) : '-';
                const isPassing = marks >= exam.passingMarks;
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{student.indexNumber || student.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.fullName}</td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" max={exam.totalMarks}
                        value={marksData[student.id] || ''} onChange={(e) => handleMarksChange(student.id, e.target.value)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {marks > 0 && <Badge variant={isPassing ? 'success' : 'danger'}>{grade}</Badge>}
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

// Reports Dropdown Button
const ReportsDropdown: React.FC<{
  group: ClassGroup;
  isGenerating: boolean;
  onClassTermReport: (classId: string) => void;
  onBulkReportCards: (classId: string) => void;
}> = ({ group, isGenerating, onClassTermReport, onBulkReportCards }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const items: { label: string; icon: React.ReactNode; onClick: () => void }[] = [];

  if (group.hasSections) {
    group.classes.forEach((cls) => {
      items.push({ label: `Class Ranking — ${cls.name}`, icon: <BarChart3 size={15} />, onClick: () => onClassTermReport(cls.id) });
    });
    group.classes.forEach((cls) => {
      items.push({ label: `All Report Cards — ${cls.name}`, icon: <Download size={15} />, onClick: () => onBulkReportCards(cls.id) });
    });
  } else {
    items.push({ label: 'Class Ranking Report', icon: <BarChart3 size={15} />, onClick: () => onClassTermReport(group.classes[0].id) });
    items.push({ label: 'All Report Cards', icon: <Download size={15} />, onClick: () => onBulkReportCards(group.classes[0].id) });
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" onClick={() => setOpen(!open)} disabled={isGenerating}>
        <FileText size={18} className="mr-2" />
        {isGenerating ? 'Generating...' : 'Reports'}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { setOpen(false); item.onClick(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamsPage;
