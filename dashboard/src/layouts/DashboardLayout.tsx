import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionBanner } from '../components/SessionBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: '🏠', end: true },
  { to: '/dashboard/care-users', label: 'Care Users', icon: '👥' },
  { to: '/dashboard/routines', label: 'Daily Routines', icon: '📅' },
  { to: '/dashboard/medicines', label: 'Medicines', icon: '💊' },
  { to: '/dashboard/communication', label: 'Communication', icon: '💬' },
  { to: '/dashboard/situations', label: 'Situation Guidance', icon: '🧭' },
  { to: '/dashboard/emergency-contacts', label: 'Emergency Contacts', icon: '📞' },
  { to: '/dashboard/sos-alerts', label: 'SOS Alerts', icon: '🚨' },
  { to: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

function pageTitle(pathname: string): string {
  const found = navItems.find(i => i.end ? pathname === i.to : pathname.startsWith(i.to));
  return found ? found.label : 'Dashboard';
}

export function DashboardLayout() {
  const { user, signOut, sessionStatus } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const title = pageTitle(location.pathname);
  const caregiverName = user?.displayName || user?.fullName || user?.email || 'Caregiver';

  const onLogout = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {sidebarOpen ? <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Primary">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">LB</span>
          <div>
            <div className="brand-title">Life Buddy</div>
            <div className="brand-sub">Caregiver Dashboard</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={onLogout} disabled={sessionStatus === 'offline_unverified' && !user}>
            <span className="nav-icon" aria-hidden="true">↩</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" aria-label="Open navigation menu" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <div className="breadcrumb">Life Buddy / {title}</div>
              <h1 className="page-title">{title}</h1>
            </div>
          </div>
          <div className="topbar-right">
            <div className="profile-menu">
              <button className="profile-btn" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Profile menu">
                <span className="avatar" aria-hidden="true">{(caregiverName || 'C').charAt(0).toUpperCase()}</span>
                <span className="profile-name">{caregiverName}</span>
                <span aria-hidden="true">▾</span>
              </button>
              {menuOpen ? (
                <div className="menu-dropdown" role="menu">
                  <div className="menu-meta" role="none">
                    <div className="menu-strong">{caregiverName}</div>
                    {user?.email ? <div className="menu-muted">{user.email}</div> : null}
                    <div className="menu-muted">Role: {user?.role || 'caregiver'}</div>
                  </div>
                  <button role="menuitem" className="menu-item" onClick={onLogout}>Logout</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main-content" className="content" tabIndex={-1}>
          <SessionBanner />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
