import { NavLink, Outlet } from 'react-router-dom';
import InstallPrompt from './InstallPrompt';

const navItems = [
  { to: '/', label: 'Hem' },
  { to: '/pass', label: 'Pass' },
  { to: '/logga', label: 'Logga' },
  { to: '/historik', label: 'Historik' },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Styrketräning, tydligt sparad</p>
          <h1>Järnkoll</h1>
        </div>
        <div className="topbar-mark">JK</div>
      </header>

      <InstallPrompt />

      <main className="page-shell">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Huvudnavigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-link${isActive ? ' is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
