import { createContext, useContext, ReactNode } from 'react';
import useSupabaseAuth from '@/hooks/use-supabase-auth';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/hooks/use-supabase-auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User; profile: Profile | null }>;
  signUp: (email: string, password: string, profileData: Omit<Profile, "id" | "created_at">) => Promise<User>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  updateProfile: (updates: Partial<Omit<Profile, "id">>) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}