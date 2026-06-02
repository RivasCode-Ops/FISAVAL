import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/database';
import type { Session, UserRole } from '@/types';

type AuthState = {
  session: Session | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      async login(email, senha) {
        const user = await db.users.where('email').equals(email.trim().toLowerCase()).first();
        if (!user || user.senha !== senha) return false;
        set({
          session: {
            userId: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
          },
        });
        return true;
      },
      logout: () => set({ session: null }),
      hasRole: (...roles) => {
        const s = get().session;
        return !!s && roles.includes(s.role);
      },
    }),
    { name: 'fisaval-session' },
  ),
);
