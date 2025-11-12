// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { NotificationProvider } from './context/NotificationContext';

// Import các trang/component
import Login from "./components/Login";
import Register from "./components/Register";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import DashboardAdmin from "./components/DashboardAdmin";
import TaskBoard from "./components/TaskBoard";
import Notes from "./components/Notes";
import Calendar from "./components/Calendar";
import Pomodoro from "./components/Pomodoro";
import AIAssistant from "./components/AIAssistant";
import Workspaces from "./components/Workspaces";
import WorkspaceDetail from "./components/Workspacedetail";
import WorkspaceSettings from "./components/WorkspaceSettings"; 
import StudyRoom from "./components/StudyRoom";
import Header from "./components/Header";
import Profile from "./components/Profile";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Settings from "./components/Settings";
import MainNavbar from "./components/MainNavbar";
import Forum from "./components/Forum";

// (Xóa 'import MyTasks' khỏi đây)

import "./App.css"; // CSS chung

const AppLayout = ({ onLogout, isLoggedIn }) => (
  <div className="main-content">
    <Header onLogout={onLogout} isLoggedIn={isLoggedIn} />
    <MainNavbar />
    <div className="content-area">
      <Outlet context={{ onLogout }} />
    </div>
  </div>
);

const AuthLayout = ({ children }) => <div className="auth-layout">{children}</div>;

const PublicRoutes = ({ isLoggedIn, userRole }) => {
  if (isLoggedIn) {
    const path = userRole === "admin" ? "/dashboard-admin" : "/app/dashboard";
    return <Navigate to={path} replace />;
  }
  return <AuthLayout><Outlet /></AuthLayout>;
};


function App() {

  const [userRole, setUserRole] = useState(() => localStorage.getItem("role"));
  const isLoggedIn = !!userRole;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
  }, []);

  const handleLoginSuccess = () => {
    setUserRole(localStorage.getItem("role"));
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUserRole(null);
  };

  const redirectOnLogin = () => {
    if (userRole === "admin") {
      return <Navigate to="/dashboard-admin" replace />;
    }
    return <Navigate to="/app/dashboard" replace />;
  };


  return (
    <NotificationProvider>
      <Router>
        <Routes>

          {/* === 1. LANDING PAGE === */}
          <Route
            path="/"
            element={
              isLoggedIn ? redirectOnLogin() : <LandingPage />
            }
          />

          {/* === 2. AUTH === */}
          <Route element={<PublicRoutes isLoggedIn={isLoggedIn} userRole={userRole} />}>
            <Route
              path="/login"
              element={<Login onLoginSuccess={handleLoginSuccess} />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>

          {/* === 3. ADMIN === */}
          <Route
            path="/dashboard-admin"
            element={
              isLoggedIn && userRole === "admin" ? (
                <DashboardAdmin onLogout={handleLogout} /> 
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* === 4. LAYOUT CHÍNH USER === */}
          <Route
            path="/app"
            element={
              isLoggedIn && userRole === "user" ? (
                <AppLayout onLogout={handleLogout} isLoggedIn={isLoggedIn} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            {/* Các trang con */}
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<TaskBoard />} />
            
            {/* --- (CODE ĐÃ XÓA) --- */}
            {/* (Đã xóa Route 'my-tasks') */}
            {/* --- (KẾT THÚC XÓA) --- */}
            
            <Route path="notes" element={<Notes />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="pomodoro" element={<Pomodoro />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="forum" element={<Forum />} /> 
            <Route path="workspace/:id" element={<WorkspaceDetail />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="study-room" element={<StudyRoom />} />
            <Route path="workspace/:id/settings" element={<WorkspaceSettings />} />
          </Route> 

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </NotificationProvider> 
  );
}

export default App;