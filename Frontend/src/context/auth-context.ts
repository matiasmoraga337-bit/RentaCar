import { createContext } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  roles: string[];
}

export interface ProfileUser {
  ID_usuario: number;
  email_usuario: string;
  nombres_persona: string;
  apellido_paterno_persona: string;
  apellido_materno_persona?: string | null;
}

export interface RegisterPayload {
  rut: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  profile: ProfileUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
