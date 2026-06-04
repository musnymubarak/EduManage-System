import React, { useEffect, useState } from 'react';
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
  Building,
  HardHat,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import logo from '../../logo.png';

type NavItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  roles: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Tick the clock once a minute so the header date/time stays fresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['all'] },
      ],
    },
    {
      label: 'People',
      items: [
        { path: '/students', icon: Users, label: 'Students', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/classes', icon: Building, label: 'Classes', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/teachers', icon: GraduationCap, label: 'Teachers', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/staff', icon: HardHat, label: 'Staff', roles: ['SUPER_ADMIN', 'ADMIN'] },
      ],
    },
    {
      label: 'Academics',
      items: [
        { path: '/attendance', icon: CalendarCheck, label: 'Attendance', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/exams', icon: FileText, label: 'Exams', roles: ['SUPER_ADMIN', 'ADMIN'] },
      ],
    },
    {
      label: 'Student Fee',
      items: [
        { path: '/finance', icon: DollarSign, label: 'Student Fee', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/donations', icon: Gift, label: 'Donations', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/expenditures', icon: TrendingUp, label: 'Expenditures', roles: ['SUPER_ADMIN', 'FINANCE_OFFICER'] },
      ],
    },
    {
      label: 'Operations',
      items: [
        { path: '/inventory', icon: Package, label: 'Inventory', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/todos', icon: CheckSquare, label: 'Todo Dashboard', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['SUPER_ADMIN', 'ADMIN'] },
      ],
    },
    {
      label: 'System',
      items: [
        { path: '/users', icon: UserCog, label: 'User Management', roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  const canSee = (item: NavItem) =>
    item.roles.includes('all') || item.roles.includes(user?.role || '');

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(canSee) }))
    .filter((g) => g.items.length > 0);

  const allItems = navGroups.flatMap((g) => g.items);
  const isActive = (path: string) => location.pathname === path;
  const activeLabel =
    allItems.find((item) => item.path === location.pathname)?.label || 'Dashboard';

  const userInitials = (user?.fullName || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const SidebarContent = (
    <>
      <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
          <img
            src={logo}
            alt="SLAC"
            className="h-7 w-7 object-contain brightness-0 invert"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">SLAC</p>
          <p className="truncate text-xs text-slate-400">Management Suite</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
        <nav className="space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                      (active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white')
                    }
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-white" />
                    )}
                    <Icon
                      size={18}
                      className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-overlay-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-slate-800 bg-slate-900 shadow-xl animate-modal-in">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
              {activeLabel}
            </h1>
          </div>

          <div className="hidden text-right text-xs text-gray-500 md:block">
            <p className="font-medium text-gray-700">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {/* User chip */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((s) => !s)}
              className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 text-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {userInitials}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[160px] truncate text-sm font-medium text-gray-900">
                  {user?.fullName}
                </span>
                <span className="block text-[11px] text-gray-500">
                  {user?.role?.replace('_', ' ')}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={
                  'hidden text-gray-400 transition-transform sm:block ' +
                  (userMenuOpen ? 'rotate-180' : '')
                }
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg animate-modal-in">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">{user?.fullName}</p>
                    <p className="truncate text-xs text-gray-500">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-gray-100" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar bg-gray-50">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
