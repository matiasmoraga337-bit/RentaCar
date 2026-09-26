import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { API_URL, apiRequest, refreshTokenKey, tokenKey } from '../services/api';

import {
  AuthContext,
  type AuthUser,
  type ProfileUser,
  type RegisterPayload,
} from './auth-context';

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

interface ProfileResponse {
  user: ProfileUser;
  roles: string[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem(tokenKey)));

  useEffect(() => {
    const token = sessionStorage.getItem(tokenKey);

    if (!token) {
      return;
    }

    apiRequest<ProfileResponse>('/auth/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((result) => {
        setProfile(result.user);
        setUser({
          id: result.user.ID_usuario,
          email: result.user.email_usuario,
          roles: result.roles,
        });
      })
      .catch(() => sessionStorage.removeItem(tokenKey))
      .finally(() => setLoading(false));
  }, []);

  async function saveAuth(result: AuthResponse) {
    sessionStorage.setItem(tokenKey, result.token);
    sessionStorage.setItem(refreshTokenKey, result.refreshToken);
    setUser(result.user);

    const profileResult = await apiRequest<ProfileResponse>('/auth/perfil', {
      headers: { Authorization: `Bearer ${result.token}` },
    });
    setProfile(profileResult.user);
  }

  async function login(email: string, password: string) {
    const result = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await saveAuth(result);
  }

  async function register(payload: RegisterPayload) {
    const result = await apiRequest<{ message: string }>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return result.message;
  }

  async function logout() {
    const refreshToken = sessionStorage.getItem(refreshTokenKey);

    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // El cierre local de sesion ocurre de todos modos.
      }
    }

    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(refreshTokenKey);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
