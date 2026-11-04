import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { Layout } from '../components/layout/Layout.jsx';
import { Login } from '../pages/Login.jsx';
import { Register } from '../pages/Register.jsx';
import { Dashboard } from '../pages/Dashboard.jsx';
import { UploadFiles } from '../pages/UploadFiles.jsx';
import { FileHistory } from '../pages/FileHistory.jsx';
import { FileDetails } from '../pages/FileDetails.jsx';
import { NotFound } from '../pages/NotFound.jsx';
import { useAuth } from '../hooks/useAuth.js';

export const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      {/* Public routes - Redirect to /dashboard if authenticated */}
      <Route
        path="/login"
        element={
          !loading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />
      <Route
        path="/register"
        element={
          !loading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
        }
      />

      {/* Protected routes wrapped in ProtectedRoute & Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadFiles />} />
          <Route path="/files" element={<FileHistory />} />
          <Route path="/files/:id" element={<FileDetails />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
