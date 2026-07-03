import { useEffect, useState } from 'react';

import { Outlet } from 'react-router-dom';

import { getApiUrl, isApiMode } from '@/api/config';

import { AppShell } from '@/components/AppShell';

import { useAuthStore } from '@/store/authStore';

import { useApiHealth } from '@/hooks/useApiHealth';

import { useOnline } from '@/hooks/useOnline';

import { getStoredTenantId } from '@/api/tenantStorage';

import { setRuntimeTenantId } from '@/lib/tenantFilter';

import { refreshFromServer } from '@/services/fisavalService';



export function Layout() {

  const session = useAuthStore((s) => s.session);

  const logout = useAuthStore((s) => s.logout);

  const hasRole = useAuthStore((s) => s.hasRole);

  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  const online = useOnline();

  const { health, checking, check } = useApiHealth(60_000);

  const apiMode = isApiMode();

  const [municipio, setMunicipio] = useState('');

  const [tenantId, setTenantId] = useState('');



  useEffect(() => {

    const base = getApiUrl();

    if (!base) return;

    const tid = getStoredTenantId();

    void fetch(`${base}/api/fisaval/config`, {

      headers: tid ? { 'X-Tenant-Id': tid } : {},

    })

      .then((r) => r.json())

      .then((c: { municipio?: string; tenantId?: string }) => {

        setMunicipio(c.municipio ?? '');

        const tid = c.tenantId ?? '';

        setTenantId(tid);

        setRuntimeTenantId(tid);

      })

      .catch(() => {});

  }, []);



  async function onRefresh() {

    const ok = await refreshFromServer();

    if (ok) window.location.reload();

  }



  if (!session) return null;



  return (

    <AppShell

      sessionNome={session.nome}

      sessionRole={session.role}

      municipio={municipio}

      tenantId={tenantId}

      online={online}

      apiOk={health?.ok}

      apiChecking={checking}

      apiStorage={health?.storage}

      showCoordNav={hasRole('gestor', 'admin')}

      showCampoNav={hasRole('fiscal')}

      showAdminNav={hasRole('admin')}

      showSuperNav={isSuperAdmin}

      showAdminTools={hasRole('admin')}

      onLogout={logout}

      onRefresh={apiMode && hasRole('admin') && online ? onRefresh : undefined}

      onCheckApi={apiMode && hasRole('admin') ? check : undefined}

    >

      <Outlet />

    </AppShell>

  );

}


