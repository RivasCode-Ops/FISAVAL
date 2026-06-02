import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isApiMode } from '@/api/config';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('fiscal@demo');
  const [senha, setSenha] = useState('demo123');
  const [erro, setErro] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const ok = await login(email, senha);
    if (!ok) {
      setErro('E-mail ou senha inválidos.');
      return;
    }
    const session = useAuthStore.getState().session;
    if (session?.role === 'fiscal') navigate('/campo');
    else navigate('/painel');
  }

  return (
    <div className="login-page">
      <div className="login-box card">
        <h1 style={{ marginTop: 0 }}>FISAVAL</h1>
        <p style={{ color: 'var(--muted)' }}>Fiscalização imobiliária municipal</p>
        <form onSubmit={onSubmit}>
          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          {erro && <p style={{ color: 'var(--danger)' }}>{erro}</p>}
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>
            Entrar
          </button>
        </form>
        <div className="login-hint">
          {isApiMode() && <p><strong>Modo servidor</strong> — dados na API (compartilhado entre dispositivos)</p>}
          <p><strong>gestor@demo</strong> / demo123 — Painel e demandas</p>
          <p><strong>fiscal@demo</strong> / demo123 — PWA de campo</p>
        </div>
      </div>
    </div>
  );
}
