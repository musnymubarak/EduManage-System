import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Download, Users, DollarSign, BookOpen, Printer, Loader2, Eye, X } from 'lucide-react';
import api from '../services/api';
import { Class } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { formatDate, formatCurrency } from '../utils/helpers';
import logo from '../logo.png';
import {
  generateAttendanceReport,
  generateFeeCollectionReport,
  generateExamResultsReport,
  generateFinancialReport,
  ReportResult,
} from '../utils/generateReports';

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('attendance');
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [term, setTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview state
  const [previewResult, setPreviewResult] = useState<ReportResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });

  const classes: Class[] = classesData?.data || [];

  // ======== LIVE DATA QUERIES FOR PREVIEW ========
  const { data: attendanceData } = useQuery({
    queryKey: ['report-attendance', selectedClass, startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/attendance/students', {
        params: { classId: selectedClass, startDate, endDate },
      });
      return response.data;
    },
    enabled: reportType === 'attendance' && !!selectedClass && !!startDate && !!endDate,
  });

  const { data: feeReportData } = useQuery({
    queryKey: ['report-fees', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/fees/report', {
        params: { startDate, endDate },
      });
      return response.data;
    },
    enabled: (reportType === 'fees' || reportType === 'financial') && !!startDate && !!endDate,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['report-students'],
    queryFn: async () => {
      const response = await api.get('/students');
      return response.data;
    },
    enabled: reportType === 'exams' && !!startDate && !!endDate && !!term,
  });

  // Generate report and get result (blob URL + filename)
  const generateReport = useCallback(async (): Promise<ReportResult | null> => {
    if (!startDate || !endDate) {
      toast.error('Please select date range');
      return null;
    }

    setIsGenerating(true);

    try {
      let result: ReportResult;
      switch (reportType) {
        case 'attendance':
          if (!selectedClass) {
            toast.error('Please select a class');
            setIsGenerating(false);
            return null;
          }
          const className = classes.find((c) => c.id === selectedClass)?.name || 'Unknown';
          result = await generateAttendanceReport(startDate, endDate, selectedClass, className);
          break;
        case 'fees':
          result = await generateFeeCollectionReport(startDate, endDate);
          break;
        case 'exams':
          if (!term) {
            toast.error('Please select a term');
            setIsGenerating(false);
            return null;
          }
          result = await generateExamResultsReport(startDate, endDate, term);
          break;
        case 'financial':
          result = await generateFinancialReport(startDate, endDate);
          break;
        default:
          return null;
      }
      return result;
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.error || 'Failed to generate report');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [reportType, startDate, endDate, selectedClass, term, classes]);

  // Preview handler
  const handlePreviewReport = async () => {
    // Clean up previous blob URL
    if (previewResult) {
      URL.revokeObjectURL(previewResult.blobUrl);
    }

    const result = await generateReport();
    if (result) {
      setPreviewResult(result);
      setIsPreviewOpen(true);
    }
  };

  // Download from preview
  const handleDownloadFromPreview = () => {
    if (!previewResult) return;
    const link = document.createElement('a');
    link.href = previewResult.blobUrl;
    link.download = previewResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report PDF downloaded successfully!');
  };

  // Close preview
  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    // Clean up blob URL after a delay to allow iframe to finish
    setTimeout(() => {
      if (previewResult) {
        URL.revokeObjectURL(previewResult.blobUrl);
        setPreviewResult(null);
      }
    }, 300);
  };

  const handlePrint = () => {
    window.print();
  };

  // ======== Compute preview data ========
  const attendancePreview = React.useMemo(() => {
    if (!attendanceData?.data) return null;
    const records = attendanceData.data;
    const present = records.filter((r: any) => r.status === 'PRESENT').length;
    const absent = records.filter((r: any) => r.status === 'ABSENT').length;
    const late = records.filter((r: any) => r.status === 'LATE').length;
    const total = records.length;
    return { present, absent, late, total, pct: total > 0 ? ((present / total) * 100).toFixed(1) : '0' };
  }, [attendanceData]);

  const feePreview = React.useMemo(() => {
    if (!feeReportData?.summary) return null;
    const s = feeReportData.summary;
    return {
      collected: s.totalPaid,
      pending: s.totalBalance,
      rate: s.totalAmount > 0 ? ((s.totalPaid / s.totalAmount) * 100).toFixed(1) : '0',
      count: s.count,
    };
  }, [feeReportData]);

  const examPreview = React.useMemo(() => {
    if (!studentsData?.data) return null;
    const students = studentsData.data;
    const classSet = new Set(students.map((s: any) => s.class?.name).filter(Boolean));
    return { totalStudents: students.length, totalClasses: classSet.size };
  }, [studentsData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handlePrint}>
              <Printer size={20} className="mr-2" />
              Print
            </Button>
            <Button onClick={handlePreviewReport} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? (
                <Loader2 size={20} className="mr-2 animate-spin" />
              ) : (
                <Eye size={20} className="mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Preview & Download Report'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <ReportTypeCard
          icon={Users}
          title="Attendance Report"
          description="Class-wise attendance summary"
          isActive={reportType === 'attendance'}
          accent="blue"
          onClick={() => setReportType('attendance')}
        />
        <ReportTypeCard
          icon={DollarSign}
          title="Fee Collection Report"
          description="Fee payments and pending"
          isActive={reportType === 'fees'}
          accent="emerald"
          onClick={() => setReportType('fees')}
        />
        <ReportTypeCard
          icon={BookOpen}
          title="Exam Results Report"
          description="Student performance analysis"
          isActive={reportType === 'exams'}
          accent="violet"
          onClick={() => setReportType('exams')}
        />
        <ReportTypeCard
          icon={FileText}
          title="Financial Report"
          description="Income and expenditure summary"
          isActive={reportType === 'financial'}
          accent="amber"
          onClick={() => setReportType('financial')}
        />
      </div>

      {/* Report Filters */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Report Parameters</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {reportType === 'attendance' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
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

          {reportType === 'exams' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Term</option>
                <option value="FIRST_TERM">First Term</option>
                <option value="SECOND_TERM">Second Term</option>
                <option value="THIRD_TERM">Third Term</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Data Preview */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Data Preview</h3>
        <ReportDataPreview
          reportType={reportType}
          startDate={startDate}
          endDate={endDate}
          classId={selectedClass}
          term={term}
          attendancePreview={attendancePreview}
          feePreview={feePreview}
          examPreview={examPreview}
        />
      </Card>

      {/* ===== PDF PREVIEW MODAL ===== */}
      {isPreviewOpen && previewResult && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Top bar */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Report Preview</h3>
                <p className="text-[11px] text-gray-400 font-medium">{previewResult.filename}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadFromPreview}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <Download size={16} />
                Download PDF
              </button>
              <button
                onClick={handleClosePreview}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 p-4 overflow-hidden">
            <iframe
              src={previewResult.blobUrl}
              title="Report Preview"
              className="w-full h-full rounded-xl border border-white/10 shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Report Type Card Component
interface ReportTypeCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  isActive: boolean;
  accent: 'blue' | 'emerald' | 'violet' | 'amber';
  onClick: () => void;
}

const ACCENTS = {
  blue:    { gradient: 'from-[#2563eb] to-[#4f46e5]', lightBg: 'bg-blue-50', lightText: 'text-blue-600' },
  emerald: { gradient: 'from-[#10b981] to-[#0d9488]', lightBg: 'bg-green-50', lightText: 'text-green-600' },
  violet:  { gradient: 'from-[#8b5cf6] to-[#7c3aed]', lightBg: 'bg-purple-50', lightText: 'text-purple-600' },
  amber:   { gradient: 'from-[#f59e0b] to-[#ea580c]', lightBg: 'bg-orange-50', lightText: 'text-orange-600' },
};

const ReportTypeCard: React.FC<ReportTypeCardProps> = ({
  icon: Icon,
  title,
  description,
  isActive,
  accent,
  onClick,
}) => {
  const a = ACCENTS[accent];
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden text-left p-5 rounded-2xl transition-all duration-300 border border-gray-100/30 outline-none active:scale-[0.98] ${
        isActive
          ? `bg-gradient-to-r ${a.gradient} text-white shadow-lg shadow-blue-100/10`
          : 'bg-white border-2 border-gray-100/70 hover:border-gray-200 text-gray-900 shadow-sm hover:shadow-md hover:-translate-y-1'
      }`}
    >
      {isActive && (
        <>
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />
          <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/[0.04] pointer-events-none" />
        </>
      )}

      <div className="mb-4 relative z-10">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
          isActive
            ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)]'
            : `${a.lightBg} ${a.lightText}`
        }`}>
          <Icon size={24} className="stroke-[2]" />
        </div>
      </div>

      <div className="relative z-10">
        <h3 className={`font-black tracking-tight mb-1 text-sm ${isActive ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{description}</p>
      </div>
    </button>
  );
};

// Data Preview Component (shows live numbers from the DB)
interface ReportDataPreviewProps {
  reportType: string;
  startDate: string;
  endDate: string;
  classId?: string;
  term?: string;
  attendancePreview: { present: number; absent: number; late: number; total: number; pct: string } | null;
  feePreview: { collected: number; pending: number; rate: string; count: number } | null;
  examPreview: { totalStudents: number; totalClasses: number } | null;
}

const ReportDataPreview: React.FC<ReportDataPreviewProps> = ({
  reportType,
  startDate,
  endDate,
  classId,
  term,
  attendancePreview,
  feePreview,
  examPreview,
}) => {
  if (!startDate || !endDate) {
    return (
      <div className="py-12 text-center text-gray-500">
        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p>Select date range to see data preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="mb-6 border-b pb-4 flex items-center gap-4">
          <img src={logo} alt="Samaiya Madrasa Logo" className="h-16 w-16 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Samaiya Madrasa</h1>
            <p className="text-gray-600">
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
            </p>
          </div>
        </div>
          <p className="text-sm text-gray-500">
            Period: {formatDate(startDate)} to {formatDate(endDate)}
          </p>

        {reportType === 'attendance' && classId && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Attendance Summary</h2>
            {attendancePreview ? (
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{attendancePreview.present}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{attendancePreview.absent}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-amber-600">{attendancePreview.late}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Attendance %</p>
                  <p className="text-2xl font-bold text-blue-600">{attendancePreview.pct}%</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-2">Loading attendance data...</p>
            )}
          </div>
        )}

        {reportType === 'fees' && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Fee Collection Summary</h2>
            {feePreview ? (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(feePreview.collected)}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(feePreview.pending)}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Collection Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{feePreview.rate}%</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-2">Loading fee data...</p>
            )}
          </div>
        )}

        {reportType === 'exams' && term && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Exam Results Summary - {term.replace(/_/g, ' ')}</h2>
            {examPreview ? (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{examPreview.totalStudents}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Total Classes</p>
                  <p className="text-2xl font-bold text-green-600">{examPreview.totalClasses}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Term</p>
                  <p className="text-2xl font-bold text-purple-600">{term.replace(/_/g, ' ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-2">Loading student data...</p>
            )}
          </div>
        )}

        {reportType === 'financial' && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Financial Summary</h2>
            {feePreview ? (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(feePreview.collected)}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(feePreview.pending)}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-sm text-gray-600">Net Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(feePreview.collected - feePreview.pending)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-2">Loading financial data...</p>
            )}
          </div>
        )}

        <div className="mt-6 border-t pt-4 text-sm text-gray-500">
          <p>Generated on: {formatDate(new Date().toISOString())}</p>
          <p className="mt-1">
            Click <strong>"Preview & Download Report"</strong> to generate a full PDF report, preview it, then download.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
