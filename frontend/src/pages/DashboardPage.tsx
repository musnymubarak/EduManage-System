import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DashboardStats } from '../types';
import logo from '../logo.png';
import { 
  Users, GraduationCap, CalendarCheck, AlertCircle, 
  DollarSign, ArrowRight, CheckCircle2, Clock, 
  AlertTriangle, TrendingUp, BookOpen 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const FEE_COLORS = {
  PAID: '#10b981',    // emerald
  PARTIAL: '#f59e0b', // amber
  PENDING: '#6366f1', // indigo
  OVERDUE: '#ef4444'  // red
};

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
        <div className="text-lg font-medium text-gray-500 animate-pulse">Loading amazing dashboard...</div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <img src={logo} alt="SLAC Logo" className="h-16 w-16 object-contain" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome to Sumaiya Ladies Arabic College</h2>
          <p className="text-gray-500 font-medium tracking-wide">Here's what's happening at SLAC today.</p>
        </div>
      </div>
      {/* Overview Cards - Modern Gradient Style */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/students" className="group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Students</p>
              <h3 className="text-3xl font-bold">{stats?.overview.totalStudents || 0}</h3>
              <p className="text-blue-100 text-sm mt-2">{stats?.overview.activeStudents || 0} active</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl"><Users size={24} /></div>
          </div>
        </Link>

        <Link to="/teachers" className="group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">Total Teachers</p>
              <h3 className="text-3xl font-bold">{stats?.overview.totalTeachers || 0}</h3>
              <p className="text-teal-100 text-sm mt-2">{stats?.overview.activeTeachers || 0} active</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl"><GraduationCap size={24} /></div>
          </div>
        </Link>

        <Link to="/attendance" className="group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Today's Attendance</p>
              <h3 className="text-3xl font-bold">{stats?.todayAttendance.students.percentage || 0}%</h3>
              <p className="text-purple-100 text-sm mt-2">Student attendance</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl"><CalendarCheck size={24} /></div>
          </div>
        </Link>

        <Link to="/fees" className="group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Monthly Collection</p>
              <h3 className="text-2xl font-bold">LKR {(stats?.financial.monthlyCollection || 0).toLocaleString()}</h3>
              <p className="text-orange-100 text-sm mt-2">{stats?.financial.pendingFees || 0} pending fees</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl"><DollarSign size={24} /></div>
          </div>
        </Link>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Trend (Area Chart) */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              6-Month Financial Trend
            </h3>
            <Link to="/finance" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              View Finance <ArrowRight size={16} />
            </Link>
          </div>
          <div className="h-[300px] w-full">
            {stats?.financialTrends && stats.financialTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.financialTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(val) => `Rs ${val / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Income" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" name="Expenses" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No financial data available</div>
            )}
          </div>
        </div>

        {/* Top 3 Urgent Todos */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="text-indigo-500" size={20} />
              Top Priority Tasks
            </h3>
            <Link to="/todos" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View All</Link>
          </div>
          
          <div className="flex-1 space-y-3">
            {stats?.topTodos && stats.topTodos.length > 0 ? (
              stats.topTodos.map((todo) => (
                <div 
                  key={todo.id} 
                  onClick={() => navigate('/todos')}
                  className="group relative cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-gray-800 pr-4">{todo.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium border ${getPriorityColor(todo.priority)}`}>
                      {todo.priority}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <Clock size={14} className="mr-1" />
                    <span>Created {new Date(todo.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-200 rounded-xl">
                <CheckCircle2 size={40} className="text-emerald-400 mb-2" />
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-sm text-gray-400">No pending tasks found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CalendarCheck className="text-purple-500" size={20} />
              7-Day Attendance Trend
            </h3>
          </div>
          <div className="h-[250px] w-full">
            {stats?.attendanceTrends && stats.attendanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" name="Students" dataKey="studentPercentage" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Teachers" dataKey="teacherPercentage" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No attendance data available</div>
            )}
          </div>
        </div>

        {/* Fee Status Donut */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <DollarSign className="text-amber-500" size={20} />
              Current Fee Status Breakdown
            </h3>
          </div>
          <div className="flex h-[250px] flex-col md:flex-row items-center">
            {stats?.feeStatusCounts && stats.feeStatusCounts.length > 0 ? (
              <>
                <div className="h-full w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.feeStatusCounts}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.feeStatusCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FEE_COLORS[entry.name as keyof typeof FEE_COLORS] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-full md:w-1/2 flex-col justify-center space-y-3 px-4">
                  {stats.feeStatusCounts.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: FEE_COLORS[entry.name as keyof typeof FEE_COLORS] || '#cbd5e1' }}
                        />
                        <span className="text-sm font-medium text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex w-full h-full items-center justify-center text-gray-400">No fee data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Admissions Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts & Notifications */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={20} />
            System Alerts
          </h3>
          <div className="space-y-4">
            <Link to="/todos" className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-4 transition-colors hover:bg-red-100">
              <div className="flex items-center gap-3">
                <div className="bg-red-200 text-red-600 p-2 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="font-semibold text-red-900">Urgent Tasks Needed</p>
                  <p className="text-sm text-red-700">Require immediate attention</p>
                </div>
              </div>
              <span className="text-2xl font-black text-red-600">{stats?.alerts.urgentTodos || 0}</span>
            </Link>

            <Link to="/inventory" className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4 transition-colors hover:bg-orange-100">
              <div className="flex items-center gap-3">
                <div className="bg-orange-200 text-orange-600 p-2 rounded-lg">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="font-semibold text-orange-900">Low Stock Inventory</p>
                  <p className="text-sm text-orange-700">Items below minimum threshold</p>
                </div>
              </div>
              <span className="text-2xl font-black text-orange-600">{stats?.alerts.lowStockItems || 0}</span>
            </Link>
          </div>
        </div>

        {/* Recent Admissions */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-500" size={20} />
              Recent Admissions
            </h3>
            <Link to="/students" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View All</Link>
          </div>
          {stats?.recentAdmissions && stats.recentAdmissions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentAdmissions.map((student: any) => (
                <Link 
                  key={student.id} 
                  to={`/students/${student.id}`}
                  className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      {student.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{student.fullName}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {student.admissionNumber} • {student.class?.name || 'No Class'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
              No recent admissions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
