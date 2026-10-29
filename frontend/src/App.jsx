import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import StudentPortal from './components/StudentPortal';
import WardenPortal from './components/WardenPortal';
import SecurityGatePortal from './components/SecurityGatePortal';
import AdminDashboard from './components/AdminDashboard';
import MessPortal from './components/MessPortal';
import MaintenancePortal from './components/MaintenancePortal';
import ParentPortal from './components/ParentPortal';
import CollegeShowcase from './components/CollegeShowcase';
import DigitalSafetyMapModal from './components/DigitalSafetyMapModal';
import SOSTriggerModal from './components/SOSTriggerModal';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [safetyMapOpen, setSafetyMapOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [activeSOSList, setActiveSOSList] = useState([]);
  
  // Theme state: defaults to 'light' for clean, simplified, accessible look
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('hostelos_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hostelos_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    // Check saved session in localStorage if any
    const savedUser = localStorage.getItem('hostelos_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        setCurrentRole(u.role);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('hostelos_user');
      }
    }
    fetchActiveSOS();
    const interval = setInterval(fetchActiveSOS, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveSOS = async () => {
    try {
      const res = await fetch('/api/sos/incidents');
      const data = await res.json();
      setActiveSOSList(data.filter(s => s.status !== 'Resolved'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsLoggedIn(true);
    localStorage.setItem('hostelos_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    setIsLoggedIn(false);
    localStorage.removeItem('hostelos_user');
  };

  const handleExplorePublic = () => {
    setCurrentRole('public');
    setCurrentUser({ id: 'public', name: 'Public Guest', role: 'public' });
    setIsLoggedIn(true);
  };

  const handleGoToLogin = () => {
    handleLogout();
  };

  return (
    <div className="app-container">
      {/* If not logged in, display the modern, simplified Login Page */}
      {!isLoggedIn ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onExplorePublic={handleExplorePublic}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          {/* Top Navbar */}
          <Navbar
            currentUser={currentUser}
            currentRole={currentRole}
            onLogout={handleLogout}
            onOpenSafetyMap={() => setSafetyMapOpen(true)}
            onTriggerSOS={() => setSosModalOpen(true)}
            activeSOSList={activeSOSList}
            onGoToLogin={handleGoToLogin}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          {/* Main Content Body */}
          <main className="main-content">
            {currentRole === 'student' && (
              <StudentPortal
                currentUser={currentUser}
                onTriggerSOS={() => setSosModalOpen(true)}
              />
            )}
            {currentRole === 'warden' && (
              <WardenPortal
                currentUser={currentUser}
              />
            )}
            {currentRole === 'security' && (
              <SecurityGatePortal
                currentUser={currentUser}
              />
            )}
            {currentRole === 'administrator' && (
              <AdminDashboard
                currentUser={currentUser}
              />
            )}
            {currentRole === 'mess' && (
              <MessPortal
                currentUser={currentUser}
              />
            )}
            {currentRole === 'maintenance' && (
              <MaintenancePortal
                currentUser={currentUser}
                onOpenSafetyMap={() => setSafetyMapOpen(true)}
              />
            )}
            {currentRole === 'parent' && (
              <ParentPortal
                currentUser={currentUser}
              />
            )}
            {currentRole === 'public' && (
              <CollegeShowcase
                onGoToLogin={handleGoToLogin}
              />
            )}
          </main>

          {/* Modals */}
          <DigitalSafetyMapModal
            isOpen={safetyMapOpen}
            onClose={() => setSafetyMapOpen(false)}
          />

          <SOSTriggerModal
            isOpen={sosModalOpen}
            onClose={() => setSosModalOpen(false)}
            currentUser={currentUser}
            onSOSCreated={fetchActiveSOS}
          />

          {/* Clean, Simple Global Footer */}
          <footer className="footer-section">
            <div className="footer-content">
              <div>
                <strong style={{ color: 'var(--text-main)' }}>HOSTEL OS</strong> — Simple, Safe & Modern Campus Living
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Quick Access Campus & Resident Safety System
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
