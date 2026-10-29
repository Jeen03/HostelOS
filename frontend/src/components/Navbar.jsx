import React from 'react';
import {
  Shield, User, LogOut, AlertOctagon, Map,
  LogIn, Sun, Moon
} from 'lucide-react';

export default function Navbar({
  currentUser,
  currentRole,
  onLogout,
  onOpenSafetyMap,
  onTriggerSOS,
  activeSOSList,
  onGoToLogin,
  theme,
  onToggleTheme
}) {
  const hasActiveSOS = activeSOSList && activeSOSList.some(s => s.status === 'Triggered' || s.status === 'Alerted');

  const roleLabels = {
    student: 'Student',
    warden: 'Hostel Warden',
    security: 'Gate Security',
    administrator: 'Administrator',
    mess: 'Mess Staff',
    maintenance: 'Maintenance Team',
    parent: 'Parent / Guardian',
    public: 'Public Guest'
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Critical Emergency Banner if active SOS */}
      {hasActiveSOS && (
        <div style={{
          background: 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)',
          color: '#ffffff',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.85rem'
        }}>
          <span className="pulse-sos" style={{ display: 'inline-flex', padding: '4px', borderRadius: '50%', background: '#fff' }}>
            <AlertOctagon size={16} color="#dc2626" />
          </span>
          EMERGENCY ALERT REPORTED — Staff and Security are responding now.
        </div>
      )}

      <div style={{
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
          }}>
            <Shield size={22} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              HOSTEL<span style={{ color: 'var(--primary)' }}>OS</span>
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              Campus Living & Safety Portal
            </div>
          </div>
        </div>

        {/* Action Controls & User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Quick Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <>
                <Moon size={15} color="var(--primary)" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={15} color="#fbbf24" />
                <span>Light</span>
              </>
            )}
          </button>

          {currentRole !== 'public' && (
            <>
              {/* Safety Blueprint Map */}
              <button
                onClick={onOpenSafetyMap}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                title="View Safety & Emergency Exit Map"
              >
                <Map size={15} color="var(--accent-cyan)" />
                <span>Hostel Map</span>
              </button>

              {/* SOS Emergency button */}
              <button
                onClick={onTriggerSOS}
                className="btn btn-danger pulse-sos"
                style={{ fontSize: '0.8rem', padding: '6px 14px', fontWeight: 700 }}
                title="Report Emergency / Request Help"
              >
                <AlertOctagon size={15} />
                <span>Emergency SOS</span>
              </button>

              {/* User Identity Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--pill-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.82rem'
              }}>
                <User size={15} color="var(--primary)" />
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  {currentUser?.name || roleLabels[currentRole] || 'User'}
                </span>
                <span className="badge badge-ai" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  {roleLabels[currentRole] || currentRole}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                title="Log out of HostelOS"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </>
          )}

          {currentRole === 'public' && (
            <button
              onClick={onGoToLogin}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <LogIn size={15} />
              <span>Sign In to Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
