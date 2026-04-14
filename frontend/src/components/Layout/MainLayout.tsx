import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  DollarSign, 
  FileText, 
  Package, 
  CheckSquare, 
  UserCog, 
  TrendingUp,
  Gift,
  LogOut,
  BarChart3,
  Building
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['all'] },
    { path: '/students', icon: Users, label: 'Students', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/classes', icon: Building, label: 'Classes', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/teachers', icon: GraduationCap, label: 'Teachers', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/attendance', icon: CalendarCheck, label: 'Attendance', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/fees', icon: DollarSign, label: 'Fees', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/exams', icon: FileText, label: 'Exams', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/inventory', icon: Package, label: 'Inventory', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/todos', icon: CheckSquare, label: 'Todo Dashboard', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/donations', icon: Gift, label: 'Donations', roles: ['SUPER_ADMIN', 'RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/expenditures', icon: TrendingUp, label: 'Expenditures', roles: ['SUPER_ADMIN', 'EXPENDITURE_RECEPTIONIST', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'] },
    { path: '/users', icon: UserCog, label: 'User Management', roles: ['SUPER_ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter(
    (item) => item.roles.includes('all') || item.roles.includes(user?.role || '')
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Always visible on web, with independent scroll */}
      <aside className="flex w-64 flex-col flex-shrink-0 bg-white shadow-lg border-r border-gray-200">
        <div className="flex h-16 flex-shrink-0 items-center justify-center bg-blue-600 px-4">
          <h1 className="text-xl font-bold text-white">🕌 Sumaya Madrasa</h1>
        </div>
        
        {/* Independent scroll area for the sidebar content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <div className="mb-6 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{user?.role.replace('_', ' ')}</p>
            </div>

            <nav className="space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={logout}
              className="mt-6 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center border-b bg-white px-8 shadow-sm">
          <div className="flex w-full items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
