import { useState, type ReactNode } from 'react';

import { NavLink, useNavigate } from 'react-router-dom';

import { isApiMode } from '@/api/config';

import { PILOTO_LOCAL } from '@/lib/pilotoLocal';

import { labelRole } from '@/lib/roleLabels';

import { StatusBar } from '@/components/StatusBar';

import type { UserRole } from '@/types';



type Props = {

  children: ReactNode;

  sessionNome: string;

  sessionRole: UserRole;

  municipio?: string;

  tenantId?: string;

  online: boolean;

  apiOk?: boolean;

  apiChecking?: boolean;

  apiStorage?: string;

  showCoordNav: boolean;

  showCampoNav: boolean;

  showAdminNav: boolean;

  showSuperNav: boolean;

  showAdminTools: boolean;

  onLogout: () => void;

  onRefresh?: () => void;

  onCheckApi?: () => void;

};



export function AppShell({

  children,

  sessionNome,

  sessionRole,

  municipio,

  tenantId,

  online,

  apiOk,

  apiChecking,

  apiStorage,

  showCoordNav,

  showCampoNav,

  showAdminNav,

  showSuperNav,

  showAdminTools,

  onLogout,

  onRefresh,

  onCheckApi,

}: Props) {

  const navigate = useNavigate();

  const apiMode = isApiMode();

  const [pilotoDismissed, setPilotoDismissed] = useState(false);



  const navLinks = (

    <>

      {showCoordNav && (

        <>

          <NavLink to="/painel" end className="app-nav__link">

            Painel

          </NavLink>

          <NavLink to="/demandas" className="app-nav__link">

            Demandas

          </NavLink>

        </>

      )}

      {showCampoNav && (

        <NavLink to="/campo" className="app-nav__link">

          Campo

        </NavLink>

      )}

      {showAdminNav && (

        <>

          <NavLink to="/auditoria" className="app-nav__link">

            Auditoria

          </NavLink>

          <NavLink to="/admin" className="app-nav__link">

            Administração

          </NavLink>

        </>

      )}

      {showSuperNav && (

        <NavLink to="/super" className="app-nav__link">

          Global

        </NavLink>

      )}

    </>

  );



  return (

    <div className="app-shell">

      <aside className="app-sidebar">

        <div className="app-sidebar__brand">

          <span className="app-sidebar__logo">FISAVAL</span>

          {municipio && (

            <span className="app-sidebar__meta">

              {municipio}

              {tenantId ? ` · ${tenantId}` : ''}

            </span>

          )}

        </div>

        <nav className="app-nav app-nav--sidebar">{navLinks}</nav>

        <div className="app-sidebar__foot stack stack--sm">

          <StatusBar

            online={online}

            apiMode={apiMode}

            apiOk={apiOk}

            apiChecking={apiChecking}

            apiStorage={apiStorage}

          />

          <span className="app-sidebar__user">

            {sessionNome} · {labelRole(sessionRole)}

          </span>

          {apiMode && showAdminTools && online && onRefresh && (

            <button type="button" className="btn btn-sm btn-outline btn-block" onClick={onRefresh}>

              Atualizar servidor

            </button>

          )}

          {apiMode && showAdminTools && onCheckApi && (

            <button type="button" className="btn btn-sm btn-outline btn-block" onClick={onCheckApi} title="Testar API">

              Testar API

            </button>

          )}

          <button

            type="button"

            className="btn btn-sm btn-outline btn-block"

            onClick={() => {

              onLogout();

              navigate('/login');

            }}

          >

            Sair

          </button>

        </div>

      </aside>



      <div className="app-main-wrap">

        <header className="app-topbar">

          <span className="app-topbar__logo">FISAVAL</span>

          <nav className="app-nav app-nav--mobile">{navLinks}</nav>

          <button

            type="button"

            className="btn btn-sm btn-outline"

            onClick={() => {

              onLogout();

              navigate('/login');

            }}

          >

            Sair

          </button>

        </header>



        {PILOTO_LOCAL && !pilotoDismissed && (

          <div className="piloto-banner">

            <span>Modo piloto local — demanda, OS, campo e laudo PDF.</span>

            <button type="button" className="piloto-banner__close" onClick={() => setPilotoDismissed(true)} aria-label="Fechar">

              ×

            </button>

          </div>

        )}



        <main className="main">{children}</main>



        {showCampoNav && (

          <nav className="app-bottom-nav" aria-label="Campo">

            <NavLink to="/campo" className="app-bottom-nav__link">

              Campo

            </NavLink>

          </nav>

        )}

      </div>

    </div>

  );

}


