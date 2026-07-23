import React, { useState } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { authenticateGoogleUser } from '../services/api';
import { LogIn, LogOut, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export const GoogleLoginModal: React.FC = () => {
  const { user, login, logout, isLoginModalOpen, setIsLoginModalOpen } = useGoogleAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoginModalOpen) return null;

  const handleAccountLogin = async (emailToUse: string, nameToUse?: string) => {
    if (!emailToUse) {
      setError('Por favor ingrese un correo válido de Gmail');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const computedName = nameToUse || emailToUse.split('@')[0];
      const capitalizedName = computedName.charAt(0).toUpperCase() + computedName.slice(1);
      const res = await authenticateGoogleUser({
        name: capitalizedName,
        email: emailToUse,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(capitalizedName)}&background=10b981&color=fff`,
      });
      if (res.user) {
        login(res.user);
        setIsLoginModalOpen(false);
      }
    } catch (e: any) {
      setError(e.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAccountLogin(customEmail, customName);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        maxWidth: '440px',
        width: '100%',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        color: '#f8fafc'
      }}>
        <button
          onClick={() => setIsLoginModalOpen(false)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            padding: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Gestión de Cuenta Google</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Autenticación para sincronización en la nube</p>
          </div>
        </div>

        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.8rem',
            borderRadius: '10px'
          }}>
            {error}
          </div>
        )}

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px',
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <img
                src={user.picture || 'https://lh3.googleusercontent.com/a/default-user'}
                alt={user.name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #10b981' }}
              />
              <div style={{ overflow: 'hidden' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>{user.name}</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>{user.email}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                  <CheckCircle2 size={12} /> Sesión Google Activa
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              Ingresa el correo electrónico de Google correspondiente a esta terminal/dispositivo:
            </p>

            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Nombre o Alias (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Usuario Terminal 1"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Correo de Gmail</label>
                <input
                  type="email"
                  required
                  placeholder="micorreo@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LogIn size={16} /> Conectar Cuenta Google
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
