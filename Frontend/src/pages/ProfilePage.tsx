import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <main className="profile-page">
      <section className="profile-header">
        <div>
          <span className="eyebrow">MI CUENTA</span>
          <h1>Tu perfil RentaCar</h1>
          <p>Administra tus datos y prepárate para tu próximo arriendo.</p>
        </div>
        <button className="button button-outline" onClick={handleLogout}>Cerrar sesión</button>
      </section>
      <section className="profile-grid">
        <article className="profile-card profile-card-highlight">
          <span className="profile-label">USUARIO</span>
          <strong>{profile ? `${profile.nombres_persona} ${profile.apellido_paterno_persona}` : 'Cargando...'}</strong>
          <p>{user?.email}</p>
        </article>
        <article className="profile-card">
          <span className="profile-label">ROL</span>
          <strong>{user?.roles.join(' · ')}</strong>
          <p>Acceso de cliente activo</p>
        </article>
        <article className="profile-card">
          <span className="profile-label">PRÓXIMAMENTE</span>
          <strong>Tus reservas</strong>
          <p>Aquí podrás consultar tus reservas y arriendos.</p>
        </article>
      </section>
    </main>
  );
}
