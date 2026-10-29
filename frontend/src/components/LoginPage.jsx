import React, { useState } from 'react';
import {
  Shield, Lock, User, ArrowRight, AlertCircle,
  ExternalLink, Sun, Moon, ArrowLeft, Mail, Eye, EyeOff, Sparkles, Key
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onExplorePublic, theme, onToggleTheme }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDirectLogin, setShowDirectLogin] = useState(false);

  const roles = [
    {
      role: 'student',
      label: 'Student Portal',
      sub: 'Passes, Room Issues, Gym & Food',
      defaultUsername: 'student',
      defaultEmail: 'student@hostel.edu',
      icon: '🎓',
      accent: '#2563eb'
    },
    {
      role: 'warden',
      label: 'Hostel Warden',
      sub: 'Approve Outings & Safety Check',
      defaultUsername: 'warden',
      defaultEmail: 'warden@hostel.edu',
      icon: '🛡️',
      accent: '#059669'
    },
    {
      role: 'security',
      label: 'Gate Security Guard',
      sub: 'Scan Student QR Passes at Gate',
      defaultUsername: 'security',
      defaultEmail: 'security@hostel.edu',
      icon: '🛂',
      accent: '#d97706'
    },
    {
      role: 'parent',
      label: 'Parent / Guardian',
      sub: 'Check Student Safety & Outings',
      defaultUsername: 'parent',
      defaultEmail: 'guardian@family.org',
      icon: '👨‍👩‍👦',
      accent: '#db2777'
    },
    {
      role: 'mess',
      label: 'Mess Staff',
      sub: 'Kitchen Menus & Meal Headcounts',
      defaultUsername: 'mess',
      defaultEmail: 'mess@hostel.edu',
      icon: '🍽️',
      accent: '#0284c7'
    },
    {
      role: 'maintenance',
      label: 'Maintenance Team',
      sub: 'Plumber, Electrician & Repairs',
      defaultUsername: 'maintenance',
      defaultEmail: 'maintenance@hostel.edu',
      icon: '🔧',
      accent: '#7c3aed'
    },
    {
      role: 'administrator',
      label: 'Hostel Administrator',
      sub: 'Room Allocation & Overall Records',
      defaultUsername: 'admin',
      defaultEmail: 'admin@hostel.edu',
      icon: '⚙️',
      accent: '#475569'
    },
  ];

  const handleSelectRole = (roleObj) => {
    setSelectedRole(roleObj);
    setUsernameOrEmail(roleObj.defaultUsername);
    setPassword('password123');
    setErrorMsg('');
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
    setUsernameOrEmail('');
    setPassword('');
    setErrorMsg('');
  };

  const handleFillDemo = () => {
    if (selectedRole) {
      setUsernameOrEmail(selectedRole.defaultUsername);
      setPassword('password123');
      setErrorMsg('');
    }
  };

  const handleFillDemoEmail = () => {
    if (selectedRole) {
      setUsernameOrEmail(selectedRole.defaultEmail);
      setPassword('password123');
      setErrorMsg('');
    }
  };

  const handleSubmitLogin = async (e) => {
    if (e) e.preventDefault();
    const ident = usernameOrEmail.trim();
    if (!ident) {
      setErrorMsg('Please enter your username or institutional email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: ident,
          password: password,
          role: selectedRole ? selectedRole.role : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid username, email, or password.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      // Fallback: match by users list if offline/mock
      try {
        const uRes = await fetch('/api/auth/users');
        const allUsers = await uRes.json();
        const found = allUsers.find(
          u => (u.username === ident || u.email === ident || u.id === ident) &&
               (!selectedRole || u.role === selectedRole.role)
        );
        if (found) {
          onLoginSuccess(found, 'demo_token_123');
          return;
        }
      } catch (e) {
        console.error(e);
      }
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
      backgroundColor: 'var(--bg-main)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: selectedRole ? '520px' : '580px',
        padding: '36px 32px',
        borderRadius: '18px',
        boxShadow: 'var(--shadow-lg)',
        transition: 'all 0.25s ease'
      }}>
        {/* Top bar with Theme Switcher & Back button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          {selectedRole ? (
            <button
              type="button"
              onClick={handleBackToRoles}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: '8px', gap: '6px' }}
            >
              <ArrowLeft size={15} /> Change Role
            </button>
          ) : <div />}

          <button
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px' }}
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon size={14} color="var(--primary)" /> : <Sun size={14} color="#fbbf24" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: selectedRole ? '22px' : '26px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            padding: '12px',
            borderRadius: '14px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
          }}>
            <Shield size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Hostel<span style={{ color: 'var(--primary)' }}>OS</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {selectedRole
              ? `Sign in to access your ${selectedRole.label}`
              : 'Step 1: Select your role to sign in'}
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '18px',
            fontSize: '0.84rem',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* STEP 1: ROLE SELECTION VIEW */}
        {!selectedRole && (
          <div className="animate-fade-in">
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px'
            }}>
              Choose Your Role
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {roles.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleSelectRole(r)}
                  className="role-card-select"
                  title={`Select ${r.label}`}
                >
                  <div style={{
                    fontSize: '1.4rem',
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'var(--pill-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {r.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {r.sub}
                    </div>
                  </div>
                  <ArrowRight size={18} color="var(--primary)" style={{ opacity: 0.7 }} />
                </button>
              ))}
            </div>

            {/* Direct Login Toggle without picking a role */}
            <div style={{ textAlign: 'center', margin: '14px 0' }}>
              <button
                type="button"
                onClick={() => setShowDirectLogin(!showDirectLogin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {showDirectLogin ? '▲ Hide direct login' : '▼ Or sign in directly with any username or email'}
              </button>
            </div>

            {showDirectLogin && (
              <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Username or Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="e.g. student@hostel.edu or warden"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      style={{ paddingLeft: '36px' }}
                    />
                    <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '36px' }}
                    />
                    <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '11px', marginTop: '6px', fontSize: '0.95rem' }}
                >
                  {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: USERNAME/EMAIL & PASSWORD LOGIN VIEW FOR SELECTED ROLE */}
        {selectedRole && (
          <div className="animate-fade-in">
            {/* Selected Role Banner */}
            <div style={{
              background: 'var(--pill-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.6rem' }}>{selectedRole.icon}</span>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedRole.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Role: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedRole.role}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToRoles}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Change
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Username or Email Input */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Username or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${selectedRole.defaultUsername} or ${selectedRole.defaultEmail}`}
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    style={{ paddingLeft: '38px', fontSize: '0.92rem' }}
                  />
                  <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Password Input with show/hide toggle */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    Password
                  </label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Demo password: <code style={{ color: 'var(--primary)', fontWeight: 700 }}>password123</code>
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '38px', paddingRight: '40px', fontSize: '0.92rem' }}
                  />
                  <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Quick Demo Pre-fill Pills */}
              <div style={{
                background: 'var(--bg-main)',
                border: '1px dashed var(--border-medium)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={13} color="var(--primary)" />
                  <span>Demo options:</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}
                    title="Fill username"
                  >
                    Use '{selectedRole.defaultUsername}'
                  </button>
                  <button
                    type="button"
                    onClick={handleFillDemoEmail}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}
                    title="Fill email"
                  >
                    Use '{selectedRole.defaultEmail}'
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: '6px',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? 'Authenticating...' : `Sign In as ${selectedRole.label}`}
                {!loading && <ArrowRight size={17} />}
              </button>

              {/* Cancel / Back Button */}
              <button
                type="button"
                onClick={handleBackToRoles}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.85rem', padding: '9px' }}
              >
                Choose Different Role
              </button>
            </form>
          </div>
        )}

        {/* Public Campus Tour Link */}
        <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onExplorePublic}
            className="btn btn-secondary"
            style={{
              width: '100%',
              fontSize: '0.85rem',
              color: 'var(--primary)'
            }}
          >
            <ExternalLink size={15} /> Explore Public Hostel Overview & Facilities
          </button>
        </div>
      </div>
    </div>
  );
}
