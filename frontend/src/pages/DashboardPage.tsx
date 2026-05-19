import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DashboardStats } from '../types';
import logo from '../logo.png';
import {
  Users, GraduationCap, CalendarCheck, AlertCircle,
  DollarSign, ArrowRight, CheckCircle2, Clock,
  AlertTriangle, TrendingUp, BookOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const FEE_COLORS = {
  PAID: '#10b981',
  PARTIAL: '#f59e0b',
  PENDING: '#6366f1',
  OVERDUE: '#ef4444',
};

const tooltipStyle = {
  borderRadius: '10px',
  border: '1px solid rgb(229 231 235)',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
  fontSize: '12px',
} as const;

type StatCardProps = {
  to: string;
  label: string;
  value: React.ReactNode;
  sublabel: string;
  icon: LucideIcon;
  accent: 'blue' | 'emerald' | 'violet' | 'amber';
};

const ACCENTS: Record<StatCardProps['accent'], { gradient: string }> = {
  blue:    { gradient: 'from-[#2563eb] to-[#4f46e5]' },
  emerald: { gradient: 'from-[#10b981] to-[#0d9488]' },
  violet:  { gradient: 'from-[#8b5cf6] to-[#7c3aed]' },
  amber:   { gradient: 'from-[#f59e0b] to-[#ea580c]' },
};

const StatCard: React.FC<StatCardProps> = ({ to, label, value, sublabel, icon: Icon, accent }) => {
  const a = ACCENTS[accent];
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r ${a.gradient} p-6 shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.98] border border-white/10`}
    >
      {/* Curved background accents matching screenshot's circles */}
      <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/[0.07] pointer-events-none" />
      <div className="absolute right-6 top-6 w-16 h-16 rounded-full bg-white/[0.04] pointer-events-none" />

      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/80 tracking-wider uppercase">{label}</p>
          <p className="mt-1 text-3xl font-black text-white tracking-tight leading-none">{value}</p>
          <p className="mt-2 text-[11px] font-medium text-white/70 tracking-wide">{sublabel}</p>
        </div>
        
        <div className="relative flex-shrink-0 flex items-center justify-center h-14 w-14">
          {/* Glassmorphic Rounded Box matching screenshot */}
          <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-all duration-300">
            <Icon size={22} className="stroke-[2.5]" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-6 ${className || ''}`}>
    {children}
  </div>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-sm font-medium text-gray-500">Loading dashboard…</div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'HIGH':   return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'LOW':    return 'bg-gray-100 text-gray-700 ring-gray-500/20';
      default:       return 'bg-gray-100 text-gray-700 ring-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex items-center gap-6 rounded-xl border border-[#b89200]/20 bg-[#CCA300] py-0 px-6 shadow-sm sm:py-0 sm:px-8">
        <img src={logo} alt="SLAC Logo" className="h-52 w-52 flex-shrink-0 object-contain brightness-0 invert" />
        <div className="min-w-0 flex-1 text-center">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome to Sumaiya Ladies Arabic College
          </h2>
          <p className="mt-1 text-sm text-amber-50/90">
            Here's a snapshot of what's happening at SLAC today.
          </p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          to="/students"
          label="Total Students"
          value={stats?.overview.activeStudents || 0}
          sublabel={`${stats?.todayAttendance.students.present || 0}/${stats?.todayAttendance.students.total || 0} present today`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          to="/teachers"
          label="Total Teachers"
          value={stats?.overview.activeTeachers || 0}
          sublabel={`${stats?.todayAttendance.teachers.present || 0}/${stats?.todayAttendance.teachers.total || 0} present today`}
          icon={GraduationCap}
          accent="emerald"
        />
        <StatCard
          to="/finance"
          label="Monthly Expenditures"
          value={`LKR ${(stats?.financial.monthlyExpenses || 0).toLocaleString()}`}
          sublabel="Total outgoing this month"
          icon={DollarSign}
          accent="violet"
        />
        <StatCard
          to="/finance"
          label="Monthly Collection"
          value={`LKR ${(stats?.financial.monthlyCollection || 0).toLocaleString()}`}
          sublabel={`${stats?.financial.pendingFees || 0} pending fees`}
          icon={DollarSign}
          accent="amber"
        />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Financial trend */}
        <SectionCard className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={18} />
              <h3 className="text-base font-semibold text-gray-900">6-Month Financial Trend</h3>
            </div>
            <Link to="/finance" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
              View Finance <ArrowRight size={14} />
            </Link>
          </div>
          <div className="h-[300px] w-full">
            {stats?.financialTrends && stats.financialTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.financialTrends} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(val) => `Rs ${val / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, '']}
                  />
                  <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" name="Income" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" name="Expenses" dataKey="expense" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No financial data available</div>
            )}
          </div>
        </SectionCard>

        {/* Top priority tasks */}
        <SectionCard className="flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-blue-500" size={18} />
              <h3 className="text-base font-semibold text-gray-900">Top Priority Tasks</h3>
            </div>
            <Link to="/todos" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</Link>
          </div>

          <div className="flex-1 space-y-2.5">
            {stats?.topTodos && stats.topTodos.length > 0 ? (
              stats.topTodos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => navigate('/todos')}
                  className="group cursor-pointer rounded-lg border border-gray-200/70 bg-gray-50/60 p-3.5 transition-all hover:border-gray-300 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{todo.title}</h4>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getPriorityColor(todo.priority)}`}>
                      {todo.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <Clock size={12} className="mr-1" />
                    <span>Created {new Date(todo.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
                <p className="text-sm font-medium text-gray-600">All caught up!</p>
                <p className="text-xs text-gray-400">No pending tasks found.</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Secondary charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly attendance */}
        <SectionCard>
          <div className="mb-5 flex items-center gap-2">
            <CalendarCheck className="text-violet-500" size={18} />
            <h3 className="text-base font-semibold text-gray-900">7-Day Attendance Trend</h3>
          </div>
          <div className="h-[250px] w-full">
            {stats?.attendanceTrends && stats.attendanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                  <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" name="Students" dataKey="studentPercentage" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" name="Teachers" dataKey="teacherPercentage" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No attendance data available</div>
            )}
          </div>
        </SectionCard>

        {/* Fee status donut */}
        <SectionCard>
          <div className="mb-2 flex items-center gap-2">
            <DollarSign className="text-amber-500" size={18} />
            <h3 className="text-base font-semibold text-gray-900">Current Fee Status</h3>
          </div>
          <div className="flex h-[250px] flex-col items-center md:flex-row">
            {stats?.feeStatusCounts && stats.feeStatusCounts.length > 0 ? (
              <>
                <div className="h-full w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.feeStatusCounts}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.feeStatusCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FEE_COLORS[entry.name as keyof typeof FEE_COLORS] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-full flex-col justify-center space-y-2.5 px-2 md:w-1/2 md:px-4">
                  {stats.feeStatusCounts.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: FEE_COLORS[entry.name as keyof typeof FEE_COLORS] || '#cbd5e1' }}
                        />
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">No fee data available</div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Alerts & recent admissions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={18} />
            <h3 className="text-base font-semibold text-gray-900">System Alerts</h3>
          </div>
          <div className="space-y-3">
            <Link
              to="/todos"
              className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/70 p-4 transition-colors hover:bg-red-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">Urgent tasks needed</p>
                  <p className="text-xs text-red-700/80">Require immediate attention</p>
                </div>
              </div>
              <span className="text-xl font-semibold text-red-600">{stats?.alerts.urgentTodos || 0}</span>
            </Link>

            <Link
              to="/inventory"
              className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50/70 p-4 transition-colors hover:bg-orange-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-900">Low stock inventory</p>
                  <p className="text-xs text-orange-700/80">Items below minimum threshold</p>
                </div>
              </div>
              <span className="text-xl font-semibold text-orange-600">{stats?.alerts.lowStockItems || 0}</span>
            </Link>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-blue-500" size={18} />
              <h3 className="text-base font-semibold text-gray-900">Recent Admissions</h3>
            </div>
            <Link to="/students" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          {stats?.recentAdmissions && stats.recentAdmissions.length > 0 ? (
            <div className="space-y-1.5">
              {stats.recentAdmissions.map((student: any) => (
                <Link
                  key={student.id}
                  to={`/students/${student.id}`}
                  className="flex items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {student.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{student.fullName}</p>
                      <p className="truncate text-xs font-semibold text-blue-600">
                        {student.indexNumber ? `${student.indexNumber} (${student.admissionNumber})` : student.admissionNumber} • {student.class?.name || 'No Class'}
                      </p>
                    </div>
                  </div>
                  <span className="ml-3 flex-shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
              No recent admissions found
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default DashboardPage;
