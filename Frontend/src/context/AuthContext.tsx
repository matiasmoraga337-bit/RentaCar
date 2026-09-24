import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { apiRequest, tokenKey } from '../services/api';

import {
  AuthContext,
  type AuthUser,
  type ProfileUser,
  type RegisterPayload,
} from './auth-context';

interface AuthResponse {
  token: string;
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
    const result = await apiRequest<AuthResponse>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await saveAuth(result);
  }

  function logout() {
    sessionStorage.removeItem(tokenKey);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
