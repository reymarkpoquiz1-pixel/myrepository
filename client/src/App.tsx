import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminDocuments from './pages/Admin/Documents';
import AdminUsers from './pages/Admin/Users';
import CouncilorDashboard from './pages/Councilor/Dashboard';
import CouncilorDocuments from './pages/Councilor/Documents';
import DocumentView from './pages/DocumentView';
import Profile from './pages/Profile';
import Loading from './components/Common/Loading';

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* Common Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/documents/:id" element={
          <ProtectedRoute>
            <DocumentView />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/documents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDocuments />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        } />

        {/* Councilor Routes */}
        <Route path="/councilor" element={
          <ProtectedRoute allowedRoles={['councilor']}>
            <CouncilorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/councilor/documents" element={
          <ProtectedRoute allowedRoles={['councilor']}>
            <CouncilorDocuments />
          </ProtectedRoute>
        } />

        {/* Default Redirects */}
        <Route path="/" element={
          user.role === 'admin' ? 
            <Navigate to="/admin" replace /> : 
            <Navigate to="/councilor" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <div className="app-container">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
};

export default App;