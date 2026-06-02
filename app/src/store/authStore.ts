import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiLogin, hydrateDexieFromApi } from '@/api/client';
import { isApiMode } from '@/api/config';
import { db } from '@/db/database';
import type { Session, UserRole } from '@/types';

type AuthState = {
  session: Session | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      token: null,
      async login(email, senha) {
        const normalized = email.trim().toLowerCase();

        if (isApiMode() && navigator.onLine) {
          try {
            const { user, token } = await apiLogin(normalized, senha);
            set({
              token,
              session: {
                userId: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
              },
            });
            await hydrateDexieFromApi();
            return true;
          } catch {
            /* tenta local */
          }
        }

        const user = await db.users.where('email').equals(normalized).first();
        if (!user || user.senha !== senha) return false;
        set({
          token: null,
          session: {
            userId: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
          },
        });
        return true;
      },
      logout: () => set({ session: null, token: null }),
      hasRole: (...roles) => {
        const s = get().session;
        return !!s && roles.includes(s.role);
      },
    }),
    { name: 'fisaval-session' },
  ),
);
