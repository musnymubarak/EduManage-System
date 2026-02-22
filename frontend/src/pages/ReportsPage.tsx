import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Download, Calendar, Users, DollarSign, BookOpen, Printer } from 'lucide-react';
import api from '../services/api';
import { Class } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Select } from '../components/UI/Input';
import { formatDate, formatCurrency } from '../utils/helpers';

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('attendance');
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [term, setTerm] = useState('');

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      return response.data;
    },
  });

  const classes: Class[] = classesData?.data || [];

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select date range');
      return;
    }

    try {
      let endpoint = '';
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      switch (reportType) {
        case 'attendance':
          if (!selectedClass) {
            toast.error('Please select a class');
            return;
          }
          endpoint = `/reports/attendance?${params}&classId=${selectedClass}`;
          break;
        case 'fees':
          endpoint = `/reports/fees?${params}`;
          break;
        case 'exams':
          if (!term) {
            toast.error('Please select a term');
            return;
          }
          endpoint = `/reports/exams?${params}&term=${term}`;
          break;
        case 'financial':
          endpoint = `/reports/financial?${params}`;
          break;
      }

      // For now, just show a success message since backend might not have report endpoints
      toast.success('Report generated! (Backend implementation required)');
      
      // In production, you would download the report like this:
      // const response = await api.get(endpoint, { responseType: 'blob' });
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', `${reportType}_report_${Date.now()}.pdf`);
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate report');
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
            <Button onClick={handleGenerateReport}>
              <Download size={20} className="mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ReportTypeCard
          icon={<Users className="h-8 w-8 text-blue-600" />}
          title="Attendance Report"
          description="Class-wise attendance summary"
          isActive={reportType === 'attendance'}
          onClick={() => setReportType('attendance')}
        />
        <ReportTypeCard
          icon={<DollarSign className="h-8 w-8 text-green-600" />}
          title="Fee Collection Report"
          description="Fee payments and pending"
          isActive={reportType === 'fees'}
          onClick={() => setReportType('fees')}
        />
        <ReportTypeCard
          icon={<BookOpen className="h-8 w-8 text-purple-600" />}
          title="Exam Results Report"
          description="Student performance analysis"
          isActive={reportType === 'exams'}
          onClick={() => setReportType('exams')}
        />
        <ReportTypeCard
          icon={<FileText className="h-8 w-8 text-orange-600" />}
          title="Financial Report"
          description="Income and expenditure summary"
          isActive={reportType === 'financial'}
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

      {/* Report Preview */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Report Preview</h3>
        <ReportPreview
          reportType={reportType}
          startDate={startDate}
          endDate={endDate}
          classId={selectedClass}
          term={term}
        />
      </Card>
    </div>
  );
};

// Report Type Card Component
interface ReportTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

const ReportTypeCard: React.FC<ReportTypeCardProps> = ({
  icon,
  title,
  description,
  isActive,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-left transition ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
};

// Report Preview Component
interface ReportPreviewProps {
  reportType: string;
  startDate: string;
  endDate: string;
  classId?: string;
  term?: string;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({
  reportType,
  startDate,
  endDate,
  classId,
  term,
}) => {
  if (!startDate || !endDate) {
    return (
      <div className="py-12 text-center text-gray-500">
        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p>Select date range to preview report</p>
      </div>
    );
  }

  // For demo purposes, showing a simple preview
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Buhary Madrasa</h1>
          <p className="text-gray-600">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
          </p>
          <p className="text-sm text-gray-500">
            Period: {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        </div>

        {reportType === 'attendance' && classId && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Attendance Summary</h2>
            <p className="text-gray-600">
              This section will display attendance statistics for the selected class and date range.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Attendance %</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
            </div>
          </div>
        )}

        {reportType === 'fees' && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Fee Collection Summary</h2>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-red-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
            </div>
          </div>
        )}

        {reportType === 'exams' && term && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Exam Results Summary - {term.replace('_', ' ')}</h2>
            <p className="text-gray-600">
              This section will display exam results and performance analysis.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Top Performer</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
              </div>
            </div>
          </div>
        )}

        {reportType === 'financial' && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Financial Summary</h2>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Total Expenditure</p>
                <p className="text-2xl font-bold text-red-600">-</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 border-t pt-4 text-sm text-gray-500">
          <p>Generated on: {formatDate(new Date().toISOString())}</p>
          <p className="mt-1">
            Note: Click "Generate Report" to create a downloadable PDF version with complete data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
