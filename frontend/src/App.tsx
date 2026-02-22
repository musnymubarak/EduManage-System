import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import AttendancePage from './pages/AttendancePage';
import FeesPage from './pages/FeesPage';
import ExamsPage from './pages/ExamsPage';
import InventoryPage from './pages/InventoryPage';
import TodoPage from './pages/TodoPage';
import UsersPage from './pages/UsersPage';
import ExpenditurePage from './pages/ExpenditurePage';
import DonationsPage from './pages/DonationsPage';
import ReportsPage from './pages/ReportsPage';

// Layout
import MainLayout from './components/Layout/MainLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="fees" element={<FeesPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="todos" element={<TodoPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="expenditures" element={<ExpenditurePage />} />
              <Route path="donations" element={<DonationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
