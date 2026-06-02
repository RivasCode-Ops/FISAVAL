import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import { CampoPage } from '@/pages/CampoPage';
import { DemandasPage } from '@/pages/DemandasPage';
import { HomeRedirect } from '@/pages/HomeRedirect';
import { LoginPage } from '@/pages/LoginPage';
import { AuditoriaPage } from '@/pages/AuditoriaPage';
import { PainelPage } from '@/pages/PainelPage';
import { SuperPainelPage } from '@/pages/SuperPainelPage';
import { useAuthStore } from '@/store/authStore';

export function App() {
  const session = useAuthStore((s) => s.session);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="painel" element={<PainelPage />} />
            <Route path="demandas" element={<DemandasPage />} />
            <Route path="auditoria" element={<AuditoriaPage />} />
            <Route path="super" element={<SuperPainelPage />} />
            <Route path="campo" element={<CampoPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
