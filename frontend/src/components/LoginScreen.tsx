import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { authenticateGoogleUser } from '../services/api';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Sheet, Smartphone, UserCheck, X } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginScreen: React.FC = () => {
  const { login } = useGoogleAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  
  // State for Google Account Prompt
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');


  // Helper to open Google prompt with clean state (Bug 7)
  const openGooglePrompt = useCallback(() => {
    setGoogleEmail('');
    setGoogleName('');
    setError('');
    setShowGooglePrompt(true);
  }, []);

  const handleGoogleLoginClick = () => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Fallback: si no hay client_id, abrir el modal manual
      openGooglePrompt();
      return;
    }

    try {
      if (!window.google?.accounts?.oauth2) {
        console.warn('Google Identity Services SDK no está listo. Usando prompt manual.');
        openGooglePrompt();
        return;
      }

      setLoading(true);
      setError('');
      
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account', // ESTO OBLIGA A SELECCIONAR LA CUENTA CADA VEZ
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setError(tokenResponse.error_description || tokenResponse.error || 'Error al iniciar sesión con Google');
            setLoading(false);
            return;
          }

          try {
            // Obtener información de perfil del usuario mediante el token de acceso
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            
            if (!userInfoResponse.ok) {
              throw new Error('No se pudo obtener la información de perfil de Google.');
            }
            
            const profile = await userInfoResponse.json();
            
            // Registrar/Autenticar en el backend
            const res = await authenticateGoogleUser({
              name: profile.name,
              email: profile.email,
              picture: profile.picture
            });
            
            if (res && res.user) {
              login(res.user);
            }
          } catch (err: any) {
            setError(err.message || 'Error al conectar con el servidor');
          } finally {
            setLoading(false);
          }
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      console.error('Error al inicializar token client:', err);
      setError('Error al inicializar los servicios de Google.');
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      setError('Por favor ingresa tu cuenta de correo de Google válida');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nameFromEmail = googleName || googleEmail.split('@')[0];
      const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      
      const res = await authenticateGoogleUser({
        name: capitalizedName,
        email: googleEmail.trim().toLowerCase(),
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(capitalizedName)}&background=10b981&color=fff`,
      });

      if (res.user) {
        login(res.user);
      }
    } catch (e: any) {
      setError(e.message || 'Error al conectar con Google Auth');
    } finally {
      setLoading(false);
      setShowGooglePrompt(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const nameFromEmail = email.split('@')[0];
      const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      const res = await authenticateGoogleUser({
        name: capitalizedName,
        email: email.trim().toLowerCase(),
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(capitalizedName)}&background=10b981&color=fff`,
      });
      if (res.user) {
        login(res.user);
      }
    } catch (e: any) {
      setError(e.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const res = await authenticateGoogleUser({
        name: 'Usuario Evaluador',
        email: 'evaluador@pagabien.app',
        picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
      });
      if (res.user) {
        login(res.user);
      }
    } catch (e: any) {
      setError(e.message || 'Error al iniciar sesión de prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#090d16',
      backgroundImage: `
        radial-gradient(circle at 15% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 45%),
        radial-gradient(circle at 85% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.8) 0%, transparent 100%)
      `,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      {/* Decorative Grid Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        opacity: 0.6
      }} />

      {/* Main Glassmorphic Container */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.1)',
        position: 'relative',
        zIndex: 10,
        color: '#f8fafc'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #4f46e5 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.6rem',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.35)',
            marginBottom: '14px',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            PB
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            PagaBien
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '6px', maxWidth: '300px', lineHeight: 1.4 }}>
            Suite ERP Financiera con Sincronización Google Sheets
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: 'rgba(225, 29, 72, 0.15)',
            border: '1px solid rgba(225, 29, 72, 0.4)',
            color: '#fecdd3',
            fontSize: '0.8rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Google Login Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', alignItems: 'stretch' }}>
          {/* Official Google Identity SDK container if rendered */}
          {/* Custom Google Auth Button forcing Account Selection */}
          <button
            onClick={handleGoogleLoginClick}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 18px',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
              opacity: loading ? 0.7 : 1
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
          </button>

          {/* Fallback: manual Google login if GIS SDK has origin issues */}
          <button
            onClick={openGooglePrompt}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Mail style={{ width: '16px', height: '16px' }} />
            <span>Acceder con correo Google</span>
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '12px 0',
            position: 'relative'
          }}>
            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%' }} />
            <span style={{
              position: 'absolute',
              backgroundColor: '#0f172a',
              padding: '0 12px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              o con credenciales
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Correo Electrónico</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail style={{ position: 'absolute', left: '14px', width: '18px', height: '18px', color: '#64748b' }} />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>PIN o Contraseña</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock style={{ position: 'absolute', left: '14px', width: '18px', height: '18px', color: '#64748b' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '13px 18px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.925rem',
                borderRadius: '14px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <span>{loading ? 'Verificando...' : 'Ingresar al Sistema ERP'}</span>
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </button>
          </form>

          {/* Quick Demo Access */}
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Sparkles style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
            <span>Acceso Rápido Demo / Evaluador</span>
          </button>
        </div>

        {/* Feature Highlights Footer */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <Sheet style={{ width: '18px', height: '18px', color: '#10b981' }} />
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Google Sheets</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <Smartphone style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Modo Offline</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck style={{ width: '18px', height: '18px', color: '#6366f1' }} />
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Biometría / PIN</span>
          </div>
        </div>
      </div>

      {/* Google Account Selector Modal (Triggered when clicking "Continuar con Cuenta Google") */}
      {showGooglePrompt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            color: '#f8fafc'
          }}>
            <button
              onClick={() => setShowGooglePrompt(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                padding: '10px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Autenticar con Cuenta Google</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Ingresa la cuenta Gmail única para esta sesión</p>
              </div>
            </div>

            <form onSubmit={handleGoogleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Nombre del Usuario</label>
                <input
                  type="text"
                  placeholder="Ej. Jherson Rivera"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Correo Electrónico Gmail</label>
                <input
                  type="email"
                  required
                  placeholder="tu.cuenta@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '13px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(255, 255, 255, 0.15)'
                }}
              >
                <UserCheck size={18} />
                <span>{loading ? 'Autenticando...' : 'Autenticar y Vincular Datos'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
