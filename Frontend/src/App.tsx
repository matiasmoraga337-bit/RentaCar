import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';

import { useAuth } from './context/useAuth';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProviderPage } from './pages/ProviderPage';
import { RegisterPage } from './pages/RegisterPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import './App.css';

function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="RentaCar inicio">
        <span className="brand-mark">R</span>
        <span>Renta<span>Car</span></span>
      </Link>
      <nav className="main-nav" aria-label="Navegación principal">
        <Link className={location.pathname === '/' ? 'active' : ''} to="/">Inicio</Link>
        {user ? (
          <>
            <Link className={location.pathname === '/perfil' ? 'active' : ''} to="/perfil">Mi perfil</Link>
            <Link className={location.pathname === '/proveedor' ? 'active' : ''} to="/proveedor">Proveedor</Link>
            {user.roles.includes('ADMIN') && <Link className={location.pathname === '/admin' ? 'active' : ''} to="/admin">Admin</Link>}
            <button className="nav-logout" onClick={logout}>Salir</button>
          </>
        ) : (
          <Link className="nav-login" to="/login">Iniciar sesión</Link>
        )}
      </nav>
    </header>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-state">Cargando tu sesión...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-state">Cargando tu sesión...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.roles.includes('ADMIN') ? <AdminPage /> : <Navigate to="/perfil" replace />;
}

function App() {
  const { loading } = useAuth();

  if (loading) return <div className="loading-state">Preparando RentaCar...</div>;

  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/vehiculos" element={<VehiclesPage />} />
        <Route path="/vehiculos/:id" element={<VehicleDetailPage />} />
        <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/proveedor" element={<ProtectedRoute><ProviderPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="site-footer">
        <span>RentaCar</span>
        <span>Marketplace de movilidad independiente</span>
      </footer>
    </div>
  );
}

export default App;
