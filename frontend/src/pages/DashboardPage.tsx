import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { DashboardStats } from '../types';
import { Users, GraduationCap, CalendarCheck, AlertCircle, DollarSign } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="text-blue-600" size={24} />}
          title="Total Students"
          value={stats?.overview.totalStudents || 0}
          subtitle={`${stats?.overview.activeStudents || 0} active`}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<GraduationCap className="text-green-600" size={24} />}
          title="Total Teachers"
          value={stats?.overview.totalTeachers || 0}
          subtitle={`${stats?.overview.activeTeachers || 0} active`}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<CalendarCheck className="text-purple-600" size={24} />}
          title="Today's Attendance"
          value={`${stats?.todayAttendance.students.percentage || 0}%`}
          subtitle="Student attendance"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<DollarSign className="text-yellow-600" size={24} />}
          title="Monthly Collection"
          value={`LKR ${(stats?.financial.monthlyCollection || 0).toLocaleString()}`}
          subtitle={`${stats?.financial.pendingFees || 0} pending`}
          bgColor="bg-yellow-50"
        />
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Student Attendance Today</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Present:</span>
              <span className="font-semibold">{stats?.todayAttendance.students.present || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-semibold">{stats?.todayAttendance.students.total || 0}</span>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${stats?.todayAttendance.students.percentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Teacher Attendance Today</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Present:</span>
              <span className="font-semibold">{stats?.todayAttendance.teachers.present || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-semibold">{stats?.todayAttendance.teachers.total || 0}</span>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${stats?.todayAttendance.teachers.percentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Alerts & Notifications</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AlertCard
            icon={<AlertCircle className="text-yellow-600" />}
            title="Pending Todos"
            count={stats?.alerts.todos || 0}
            color="yellow"
          />
          <AlertCard
            icon={<AlertCircle className="text-red-600" />}
            title="Urgent Todos"
            count={stats?.alerts.urgentTodos || 0}
            color="red"
          />
          <AlertCard
            icon={<AlertCircle className="text-orange-600" />}
            title="Low Stock Items"
            count={stats?.alerts.lowStockItems || 0}
            color="orange"
          />
        </div>
      </div>

      {/* Recent Admissions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Recent Admissions</h3>
        {stats?.recentAdmissions && stats.recentAdmissions.length > 0 ? (
          <div className="space-y-3">
            {stats.recentAdmissions.map((student: any) => (
              <div key={student.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {student.admissionNumber} - {student.class.name}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(student.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent admissions</p>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  bgColor: string;
}> = ({ icon, title, value, subtitle, bgColor }) => (
  <div className="rounded-lg bg-white p-6 shadow">
    <div className={`mb-4 inline-flex rounded-lg ${bgColor} p-3`}>{icon}</div>
    <h3 className="mb-1 text-sm font-medium text-gray-600">{title}</h3>
    <p className="mb-1 text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500">{subtitle}</p>
  </div>
);

const AlertCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
}> = ({ icon, title, count, color }) => {
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
