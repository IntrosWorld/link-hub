import { User, UserCredential } from 'firebase/auth';
import { ReactNode } from 'react';

export interface AuthContextValue {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
}
